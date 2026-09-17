# GeoNames Dataset Provenance & Attribution

## 1. Overview
The offline city dataset bundled with this application (`src/assets/cities.json`) is derived from the **GeoNames** geographical database.

- **Source:** [GeoNames cities1000 gazetteer dump](https://download.geonames.org/export/dump/cities1000.zip)
- **Official Provider:** GeoNames (Marc Wick / geonames.org)
- **License:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **Commercial Use:** Permitted under CC BY 4.0 with appropriate attribution.
- **Retrieval Date:** September 2026

---

## 2. Transformation Performed
The source `cities1000.txt` dataset (~31.3 MB tab-delimited text, ~171,035 geographical points with population > 1,000) was preprocessed at build/development time via `scripts/preprocessCities.js`:

1. **Field Selection:** Only minimal fields necessary for prayer time calculation and city disambiguation were retained:
   - `id`: GeoNames geonameid as string (e.g. `"3038832"`)
   - `name`: Official geographical name (UTF-8)
   - `countryCode`: ISO-3166 2-letter country code
   - `latitude`: Rounded to 4 decimal places (~11 meters precision)
   - `longitude`: Rounded to 4 decimal places (~11 meters precision)
   - `timezone`: IANA timezone identifier
   - `adminCode`: Primary administrative division code (e.g., US state code) for name disambiguation where applicable.
2. **Discarded Fields:** Alternate names, feature classes/codes, elevation, digital elevation model (dem), population, and modification timestamps were discarded to optimize asset size.
3. **Validation:** Every emitted IANA timezone was strictly validated using `Intl.DateTimeFormat`.
4. **Offline Bundling:** The dataset is packaged directly as a static application asset. No runtime network requests or web-service calls are made to GeoNames APIs.

---

## 3. Attribution Notice (For Settings / About Screen)

> **Geographical Data Attribution:**
> This application uses city and timezone data from [GeoNames](https://www.geonames.org/), licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/).
