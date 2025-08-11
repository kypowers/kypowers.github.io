import http.client
import os
import urllib.parse
from datetime import datetime

import requests
from bs4 import BeautifulSoup

LOG_FILE = 'zyn_stock_log.txt'


def log_status(message):
    """Appends a status message to the log file."""
    try:
        # The 'a' mode appends to the file. The workflow will create it in the root directory.
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(f"{message}\n")
    except Exception as e:
        print(f"❌ Failed to write to log file: {e}")


def send_pushover_notification(product_name, product_url):
    """Sends a formatted push notification using Pushover when an item is in stock."""
    app_token = os.getenv('APP_TOKEN')
    user_token = os.getenv('USER_TOKEN')

    if not all([app_token, user_token]):
        print("\nPushover credentials not set. Skipping notification.")
        print("Please set APP_TOKEN and USER_TOKEN secrets in your repository.")
        return

    title = "ZYN Stock Alert: Item is Back in Stock!"
    message = f"'{product_name}' is now available for purchase!\n\nURL: {product_url}"

    try:
        conn = http.client.HTTPSConnection("api.pushover.net:443")
        conn.request("POST", "/1/messages.json",
                     urllib.parse.urlencode({
                         "token": app_token,
                         "user": user_token,
                         "title": title,
                         "message": message,
                         "url": product_url,
                         "url_title": "View Product Page"
                     }), {"Content-type": "application/x-www-form-urlencoded"})

        response = conn.getresponse()
        if 200 <= response.status < 300:
            print("\n✅ Pushover notification sent successfully!")
        else:
            print(f"\n❌ Failed to send Pushover notification: {response.status} {response.reason}")
            print(f"Response body: {response.read().decode()}")
    except Exception as e:
        print(f"\n❌ An error occurred while sending Pushover notification: {e}")


def check_zyn_stock():
    """
    Scrapes the ZYN rewards page to check the stock status of a specific item.
    """
    product_url = "https://us.zyn.com/ZYNRewardsStore/cuisinart-compact-bullet-ice-maker/"
    print(f"Checking stock for: {product_url}")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(product_url, headers=headers, timeout=15)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL {product_url}: {e}")
        return

    soup = BeautifulSoup(response.content, 'html.parser')

    # Find the "Add to Cart" button. Its disabled status is the most reliable indicator.
    add_to_cart_button = soup.find('button', {'x-ref': 'submitButton'})
    product_name_tag = soup.find_all('h1')
    for name in product_name_tag:
        name_strip = name.get_text(strip=True)
        if name_strip == 'Welcome to ZYN.com':
            continue
        product_name_tag = name_strip
    product_name = product_name_tag

    if not add_to_cart_button:
        print("Could not find the 'Add to Cart' button. The page structure may have changed.")
        return

    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')
    # The 'disabled' attribute is present if the item is out of stock.
    if 'disabled' in add_to_cart_button.attrs:
        status_message = f"[{timestamp}] OUT OF STOCK: Item '{product_name}' is not available."
        print(status_message)
        log_status(status_message)
    else:
        status_message = f"[{timestamp}] ✅ IN STOCK: Item '{product_name}' is available!"
        print(status_message)
        log_status(status_message)
        send_pushover_notification(product_name, product_url)


if __name__ == '__main__':
    check_zyn_stock()
