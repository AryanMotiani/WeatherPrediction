import requests
import json
import os

API_URL = "https://api.spaceappschallenge.org/graphql"
QUERY = """
{
  challenge(id: "aWQ6MzEzMjg=") {
    id
    name
    resources {
      id
      title
      url
    }
  }
}
"""

def fetch_resources():
    headers = {
        "Content-Type": "application/json"
    }
    response = requests.post(API_URL, json={"query": QUERY}, headers=headers)
    response.raise_for_status()
    data = response.json()
    return data

def save_resources(data, path):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

def download_file(url, dest_folder):
    if not os.path.exists(dest_folder):
        os.makedirs(dest_folder)
    local_filename = os.path.join(dest_folder, url.split("/")[-1])
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        with open(local_filename, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    return local_filename

def main():
    data = fetch_resources()
    save_resources(data, "api_challenge_resources.json")
    resources = data.get("data", {}).get("challenge", {}).get("resources", [])
    print(f"Found {len(resources)} resources.")
    for resource in resources:
        url = resource.get("url")
        title = resource.get("title")
        if url:
            print(f"Downloading {title} from {url}")
            try:
                download_file(url, "datasets")
            except Exception as e:
                print(f"Failed to download {url}: {e}")

if __name__ == "__main__":
    main()
