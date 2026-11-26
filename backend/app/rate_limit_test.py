import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

URL = "http://127.0.0.1:8000/api/chat/message/"

# Copy these values locally from Postman > Cookies
SESSION_ID = "vvilzvq2u8bm6fafu159asitap6jzup2"
CSRF_TOKEN = "ZiKvqxA4MGU1prCkvtzd21rx17sWXTsIbMzaiuvko7hLwBK78hPj7OB7CXngNms3"

cookies = {
    "sessionid": SESSION_ID,
    "csrftoken": CSRF_TOKEN,
}

headers = {
    "Content-Type": "application/json",
    "X-CSRFToken": CSRF_TOKEN,
}

def send_request(number):
    try:
        response = requests.post(
            URL,
            json={"message": f"Rate limit test {number}"},
            cookies=cookies,
            headers=headers,
            timeout=60,
        )
        return number, response.status_code, response.text[:150]
    except Exception as error:
        return number, "ERROR", str(error)

with ThreadPoolExecutor(max_workers=21) as executor:
    futures = [
        executor.submit(send_request, i)
        for i in range(1, 22)
    ]

    for future in as_completed(futures):
        number, status, result = future.result()
        print(f"Request {number}: {status} | {result}")