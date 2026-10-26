#!/usr/bin/env bash
# Fetch the public data for the real-world evaluation (npm run eval:tcga) into eval-data/raw/.
#  - TCGA-Reports: 9,523 OCR'd pathology reports (Kefeli & Tatonetti, Patterns 2024), Mendeley Data
#    doi:10.17632/hyg5xkznpx.1, CC BY 4.0. About 11 MB zipped.
#  - Curated TCGA clinical data from the public cBioPortal API.
set -euo pipefail
mkdir -p eval-data/raw
cd eval-data/raw
URL=$(curl -s "https://data.mendeley.com/public-api/datasets/hyg5xkznpx/files?folder_id=root&version=1" \
  | python -c "import sys,json; print([f['content_details']['download_url'] for f in json.load(sys.stdin) if f['filename']=='TCGA_Reports.csv.zip'][0])")
curl -sL -o TCGA_Reports.csv.zip "$URL"
python -c "import zipfile; zipfile.ZipFile('TCGA_Reports.csv.zip').extract('TCGA_Reports.csv')"
for s in brca_tcga coadread_tcga luad_tcga lusc_tcga prad_tcga skcm_tcga; do
  curl -s -o "clin_$s.json" "https://www.cbioportal.org/api/studies/$s/clinical-data?clinicalDataType=PATIENT&projection=SUMMARY&pageSize=10000000"
done
echo "Done. Run: npm run eval:tcga"
