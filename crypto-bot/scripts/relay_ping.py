import sys
import urllib.request

# Diagnose connectivity via a public relay (no auth). For public data only.
BINANCE_PING = 'https://api.binance.com/api/v3/ping'
RELAY_URL = 'https://r.jina.ai/http/' + BINANCE_PING


def fetch(url: str, timeout: float = 8.0) -> int:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.getcode()


def main():
    try:
        code = fetch(RELAY_URL)
        print(f"relay_status={code}")
        sys.exit(0 if code == 200 else 2)
    except Exception as e:
        print(f"relay_error={e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
