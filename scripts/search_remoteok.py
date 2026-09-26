#!/usr/bin/env python3
"""
Fetch and filter jobs from the RemoteOK public API.
Usage: python scripts/search_remoteok.py [keyword1] [keyword2] ...
Outputs JSON array of matching jobs to stdout.
"""
import json, sys, urllib.request, re

API_URL = "https://remoteok.com/api"

# Default keywords aligned with Alexander's criteria
DEFAULT_KEYWORDS = [
    "airtable", "data analyst", "business intelligence", "bi analyst",
    "operations analyst", "operations coordinator", "project coordinator",
    "workflow automation", "no-code", "low-code", "automation", "data entry",
    "billing", "sql", "python", "excel", "spreadsheet", "smartsheet",
    "zapier", "make", "n8n", "web developer", "junior developer",
    "full stack", "fullstack", "systems integration", "crm", "hubspot",
]

def fetch_jobs():
    req = urllib.request.Request(API_URL, headers={
        "User-Agent": "ico-scout/1.0 (job search automation; contact: atobin@alum.utk.edu)"
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode())
    # First item is the legal notice object, skip it
    return [j for j in data if isinstance(j, dict) and "position" in j]

def matches(job, keywords):
    haystack = " ".join([
        job.get("position", ""),
        job.get("description", ""),
        " ".join(job.get("tags", [])),
    ]).lower()
    return any(kw.lower() in haystack for kw in keywords)

def clean_html(text):
    """Strip HTML tags from description."""
    return re.sub(r"<[^>]+>", " ", text or "").strip()

def format_job(job):
    return {
        "source": "remoteok",
        "id": job.get("id", ""),
        "company": job.get("company", "Unknown"),
        "title": job.get("position", ""),
        "date": job.get("date", ""),
        "url": job.get("url", ""),
        "apply_url": job.get("apply_url", job.get("url", "")),
        "location": job.get("location", "Remote"),
        "salary_min": job.get("salary_min", 0),
        "salary_max": job.get("salary_max", 0),
        "tags": job.get("tags", []),
        "description": clean_html(job.get("description", "")),
    }

def main():
    keywords = sys.argv[1:] if len(sys.argv) > 1 else DEFAULT_KEYWORDS
    try:
        jobs = fetch_jobs()
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

    matches_list = [format_job(j) for j in jobs if matches(j, keywords)]
    print(json.dumps(matches_list, indent=2))

if __name__ == "__main__":
    main()
