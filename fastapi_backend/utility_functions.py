import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from io import BytesIO

def fetch_libgen_books(book_name: str, num: int):
    """
    Searches LibGen for a given book and returns a list of book titles and their links.

    Args:
        book_name (str): The book title to search for.

    Returns:
        list of dict: A list of dictionaries with 'title' and 'link'.
    """
    base_url = "https://libgen.is/search.php"
    params = {
        "req": book_name,
        "open": "0",
        "res": num,
        "view": "simple",
        "phrase": "1",
        "column": "def"
    }

    response = requests.get(base_url, params=params)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, 'html.parser')
    results_table = soup.find('table', {'class': 'c'})

    books = []
    if results_table:
        rows = results_table.find_all('tr')[1:]  # Skip the header row
        for row in rows:
            columns = row.find_all('td')
            if len(columns) > 2:
                title_cell = columns[2]
                link_tag = title_cell.find('a')
                if link_tag and 'href' in link_tag.attrs:
                    title = link_tag.get_text(strip=True, separator=' ')
                    link = "https://libgen.is/" + link_tag['href']
                    books.append({'title': title, 'link': link})
    return books



def download_libgen_file(book_detail_url: str) -> list[BytesIO, str]:
    """
    Downloads the file from LibGen and returns it as BytesIO along with a filename.
    """
    response = requests.get(book_detail_url)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')

    mirror_link_tag = soup.find('a', string=lambda text: text and "Libgen & IPFS & Tor" in text)
    if not mirror_link_tag:
        raise ValueError("Mirror link 'Libgen & IPFS & Tor' not found.")

    mirror_url = urljoin(book_detail_url, mirror_link_tag['href'])

    mirror_response = requests.get(mirror_url)
    mirror_response.raise_for_status()
    mirror_soup = BeautifulSoup(mirror_response.text, 'html.parser')

    download_div = mirror_soup.find('div', id='download')
    if not download_div:
        raise ValueError("<div id='download'> not found in mirror page.")

    get_link_tag = download_div.find('a', string="GET")
    if not get_link_tag:
        raise ValueError("GET download link not found.")

    direct_download_url = get_link_tag['href']

    # Download the file
    file_response = requests.get(direct_download_url)
    file_response.raise_for_status()

    # Try to extract a filename from headers
    content_disposition = file_response.headers.get('content-disposition')
    filename = None
    if content_disposition:
        parts = content_disposition.split(';')
        for part in parts:
            if 'filename=' in part:
                filename = part.split('=')[1].strip('"')
                break

    if not filename:
        # If no filename found, fallback
        filename = direct_download_url.split('/')[-1]

    file_bytes = BytesIO(file_response.content)
    return file_bytes, filename
