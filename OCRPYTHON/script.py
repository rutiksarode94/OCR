import urllib
import hmac
import base64
import hashlib
import math
import random
import time
import requests
import json
from utils.ocr_utils import Inference
from utils.parser import Table
from dateutil import parser
from datetime import datetime
import re, os

deployment_id = "1"
script_id = "3807"
BASEURL = "https://tstdrv1423092.restlets.api.netsuite.com/app/site/hosting/restlet.nl"

CONSUMER_KEY = "edf5e127ac86cce24bd141e602a911352435ea09598fc015428567a5f9749d76"
SIGN_METHOD = "HMAC-SHA256"
TOKEN_ID = "530d66772ba2bed93125c7306ac6adb47dd5dedc60be476acf668d0cd5490b78"
OAUTH_VERSION = "1.0"
CONSUMER_SECRET = "4c09cff03d1559f011ee966182d38ebd75e3fc382d12b146d8fa3f7575757a41"
TOKEN_SECRET = "8573786e7a5c35500021b482a5293e69edae280c0d68eaaba0903fa36404ec5a"
NETSUITE_ACCOUNT_ID = "TSTDRV1423092"


def getAuthNonce():
    nonce_text = ""
    length = 11
    possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    for i in range(length):
        nonce_text += possible[math.floor(random.uniform(0, 1) * len(possible))]
    return nonce_text


def format_query(query):
    return query.replace(" ", "%20")


def get_time_stamp():
    return round(time.time())


def getSignature(BASE_URL, HTTP_METHOD, OAUTH_NONCE, TIME_STAMP, query=None):
    print(BASE_URL)
    data = "deploy=" + str(deployment_id) + "&"
    data += "oauth_consumer_key" + "=" + CONSUMER_KEY + "&"
    data += "oauth_nonce" + "=" + OAUTH_NONCE + "&"
    data += "oauth_signature_method" + "=" + SIGN_METHOD + "&"
    data += "oauth_timestamp" + "=" + str(TIME_STAMP) + "&"
    data += "oauth_token" + "=" + TOKEN_ID + "&"
    data += "oauth_version" + "=" + OAUTH_VERSION + "&"
    data += "script=" + str(script_id)

    signatureValue = (
        HTTP_METHOD
        + "&"
        + urllib.parse.quote(BASE_URL, safe="~()*!.'")
        + "&"
        + urllib.parse.quote(data, safe="~()*!.'")
    )
    signatureKey = (
        urllib.parse.quote(CONSUMER_SECRET, safe="~()*!.'")
        + "&"
        + urllib.parse.quote(TOKEN_SECRET, safe="~()*!.'")
    )
    signatureValue = bytes(signatureValue, "utf-8")
    signatureKey = bytes(signatureKey, "utf-8")
    shaData = hmac.new(signatureKey, signatureValue, digestmod=hashlib.sha256).digest()
    base64EncodedData = base64.b64encode(shaData)
    oauth_signature = base64EncodedData.decode("utf-8")
    oauth_signature = urllib.parse.quote(oauth_signature, safe="~()*!.'")
    return oauth_signature


def createHeader(url, HTTP_METHOD, query):
    BASE_URL = url
    OAUTH_NONCE = getAuthNonce()
    TIME_STAMP = round(time.time())
    HTTP_METHOD = HTTP_METHOD
    oauth_signature = getSignature(
        BASE_URL, HTTP_METHOD, OAUTH_NONCE, TIME_STAMP, query
    )
    OAuthHeader = "OAuth "
    OAuthHeader += 'realm="' + NETSUITE_ACCOUNT_ID + '",'
    OAuthHeader += 'oauth_token="' + TOKEN_ID + '",'
    OAuthHeader += 'oauth_consumer_key="' + CONSUMER_KEY + '",'
    OAuthHeader += 'oauth_nonce="' + OAUTH_NONCE + '",'
    OAuthHeader += 'oauth_timestamp="' + str(TIME_STAMP) + '",'
    OAuthHeader += 'oauth_signature_method="' + SIGN_METHOD + '",'
    OAuthHeader += 'oauth_version="1.0",'
    OAuthHeader += 'oauth_signature="' + oauth_signature + '"'
    headers = {
        "Authorization": OAuthHeader,
        "Content-Type": "application/json",
        "prefer": "transient",
        "Cookie": "NS_ROUTING_VERSION=LAGGING",
    }
    return headers


def extract_numeric(input_string):
    numeric_string = re.findall(r"\d+\.\d+|\d+", input_string)
    if not numeric_string:
        return "0"
    return "".join(numeric_string)


def get_payload(input):
    inference = Inference(input)

    def get_formatted_date_string(date_string):
        try:
            date_obj = parser.parse(date_string)
            formatted_date_string = datetime.strftime(date_obj, "%Y-%m-%d")
            return formatted_date_string
        except Exception as e:
            print(e)
            return date_string
        
    def get_line_items(inference):
        items = []
        for page in inference.pages:
            for box in page.boxes():
                if box["label"] == "table":
                    table = Table(box)
                    for row in table.iterrows():
                        item = {
                            "Description": "",
                            "Unit_price": 0,
                            "Quantity": 0,
                            "Line_amount": 0,
                        }
                        for cell in row.cells:
                            if cell["label"] in item and cell["text"]:
                                # Only extract numeric for numeric fields
                                if cell["label"] in ["Line_amount", "Unit_price", "Quantity"]:
                                    item[cell["label"]] = float(extract_numeric(cell["text"]))
                                else:
                                    item[cell["label"]] = cell["text"]
                        items.append(item)
        return items

  
    def get_org_file(file_url):
        try:
            org_file = requests.get(file_url)
            return org_file.content
        except Exception as e:
            print(e)
            return ""
    
    def pdf_to_base64(file_url):
        try:
            base64_encoded = base64.b64encode(requests.get(file_url).content).decode(
                "utf-8"
            )
            return base64_encoded
        except Exception as e:
            print(e)
            return ""


    customer_website = inference.get_field_value(label="customer_website")
    if not customer_website.startswith("http"):
        customer_website = "https://" + customer_website
    file_extension = os.path.splitext(inference.filename)[1].upper().replace(".", "") or "PDF"

    paylod = {
        "company_name": "",
        "vendor_name": inference.get_field_value(label="vendor_name"),
        "uploaded_date": inference.get_field_value(label="uploaded_date"),
        "updated_at": inference.get_field_value(label="updated_at"),
        "delivery_date": inference.get_field_value(label="delivery_date"),
        "po_date": get_formatted_date_string(inference.get_field_value(label="po_date")) + "T00:00:00Z",
        "BillNumber": inference.get_field_value(label="BillNumber"),
        "vendor_address": inference.get_field_value(label="vendor_address"),
        "total": 0,
        "items": get_line_items(inference),
        "originalfile": [
            {
                "filename": inference.filename,
                "filetype": file_extension,
                "contents": pdf_to_base64(inference.file_url)
            }
        ],
    }

    return paylod


def handler(input):
    try:
        print("Inside custom handler")
        query = f"script={script_id}&deploy={deployment_id}"
        headers = createHeader(BASEURL, "POST", format_query(query))
        print(headers)

        data = get_payload(input)
        # print(data)
        payload = json.dumps(data)
        final_url = BASEURL + "?" + query
        response = requests.request("POST", final_url, headers=headers, data=payload)
        if response.status_code != 200:
            raise Exception(f"Unexpected error occured: {response.text}")
        print(response.status_code)
        # print(response.json())
        json_resp = response.json()
        if response.status_code!=200 or not json_resp.get("recordid"):
            raise Exception(f"Error: Response {response.status_code} | {json_resp}")
        return input
    except Exception as e:
        raise Exception(e)