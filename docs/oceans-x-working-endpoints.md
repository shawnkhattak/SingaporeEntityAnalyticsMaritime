# Oceans-X Working Endpoints

Final tested working Oceans-X endpoints and the main data each one returns.

| # | Endpoint | Main return data |
| -: | --- | --- |
| 2 | Vessel Positions Snapshot | Array of `vesselParticulars`, `latitude`, `longitude`, `latitudeDegrees`, `longitudeDegrees`, `speed`, `course`, `heading`, `dimA`, `dimB`, `timeStamp`. |
| 3 | DepthsA | ZIP file containing the MPA depths area GIS layer. |
| 4 | Country Codes CSV ZIP | ZIP file containing country code reference data in CSV format. |
| 7 | CoastlineL | ZIP file containing the MPA coastline line GIS layer. |
| 8 | Vessel Movements by CallSign | Array of movement records: `vesselParticulars`, `movementStartDateTime`, `movementEndDateTime`, `movementStatus`, `movementType`, `locationFrom`, `locationTo`, `movementDraft`, `movementHeight`. |
| 10 | OffshoreInstallationsA | ZIP file containing offshore installation area GIS data. |
| 11 | DangersA | ZIP file containing navigational danger area GIS data. |
| 12 | Vessel Positions by Name | Vessel position records matching a vessel name, including `vesselParticulars`, coordinates, speed, course, heading, dimensions, and `timeStamp`. |
| 14 | PortsAndServicesA | ZIP file containing ports and services area GIS data. |
| 15 | Vessel Particulars by IMO Number | Vessel particulars: `vesselName`, `callSign`, `imoNumber`, `flag`, `vesselLength`, `vesselBreadth`, `vesselDepth`, `vesselType`, `grossTonnage`, `netTonnage`, `deadweight`, `mmsiNumber`, `yearBuilt`; Singapore-flagged vessels may also include `ismManager`, `shipManager`, `registeredOwnership`, `classificationSociety`. |
| 16 | Vessels Due to Arrive by Date | Array of scheduled arrival records: `vesselParticulars`, `duetoArriveTime`, `locationFrom`, `locationTo`. |
| 18 | Vessel Type CSV ZIP | ZIP file containing vessel type reference data in CSV format. |
| 19 | Vessel Particulars by Name | Vessel particulars by name with the same identity, dimensions, tonnage, MMSI, and build fields as the IMO particulars endpoint. |
| 20 | Port Codes JSON | JSON reference list of port/location codes and descriptions. |
| 21 | Country Codes JSON | JSON reference list of country codes and country names. |
| 23 | Location Codes JSON ZIP | ZIP file containing location code reference data in JSON format. |
| 24 | Vessel Movements by Name | Array of movement records: `vesselParticulars`, movement start/end times, movement status/type, origin/destination locations, draft, and height. |
| 26 | Vessel Movements by IMO Number | Array of movement records by IMO with movement times, movement type/status, `locationFrom`, `locationTo`, draft, height, and vessel identity. |
| 27 | Vessel Arrival Declaration by IMO Number | Arrival declaration records: `vesselParticulars`, `location`, `grid`, `purpose`, `agent`, `reportedArrivalTime`, `crew`, `pax`. |
| 28 | Port Clearance Cert by CallSign | Port clearance certificate details: `vesselParticulars`, `certificateNumber`, `gdvNumber`, port/berth details, departure time, issue time, expiry time. |
| 29 | Last Vessel Arrival Declaration by Vessel Name | Most recent arrival declaration: `vesselParticulars`, `location`, `grid`, `purpose`, `agent`, `reportedArrivalTime`, `crew`, `pax`. |
| 31 | Vessel Positions by CallSign | Vessel position records matching a call sign, including vessel particulars, coordinates, speed, course, heading, dimensions, and timestamp. |
| 32 | CulturalFeaturesA | ZIP file containing cultural feature area GIS data. |
| 33 | SRS Certificate by Vessel Details | Singapore Registry of Ships certificate records: vessel name, IMO, call sign, official number, registry port number, registration date, validity/closure dates, certificate number, issue date. |
| 34 | NaturalFeaturesA | ZIP file containing natural feature area GIS data. |
| 38 | PortsAndServicesP | ZIP file containing ports and services point GIS data. |
| 41 | Vessel Arrival Declaration by Date | Arrival declaration records for a date: `vesselParticulars`, `location`, `grid`, `purpose`, `agent`, `reportedArrivalTime`, `crew`, `pax`. |
| 42 | List of Vessel Particulars by Name | Vessel particulars search results by name text, including vessel identity and particulars fields where available. |
| 43 | DangersP | ZIP file containing navigational danger point GIS data. |
| 45 | DangersL | ZIP file containing navigational danger line GIS data. |
| 47 | Master Plan 2019 SDCP Nature Boundary Layer | JSON GIS data for URA nature boundary areas. |
| 48 | OffshoreInstallationsL | ZIP file containing offshore installation line GIS data. |
| 49 | Location Codes JSON | JSON reference list of location codes and descriptions. |
| 50 | Country Codes JSON ZIP | ZIP file containing country code reference data in JSON format. |
| 51 | PortsAndServicesL | ZIP file containing ports and services line GIS data. |
| 52 | Port Codes JSON ZIP | ZIP file containing port code reference data in JSON format. |
| 53 | Port Codes CSV ZIP | ZIP file containing port code reference data in CSV format. |
| 54 | Vessel Arrival Declaration by Vessel Name | Arrival declaration records by vessel name: vessel identity, location/grid, purpose, agent, reported arrival time, crew, and passengers. |
| 55 | CoastlineA | ZIP file containing coastline area GIS data. |
| 57 | Port Clearance Cert by IMO Number | Port clearance certificate details by IMO: vessel identity, certificate number, GDV number, departure time, issue time, expiry time, and port/berth details. |
| 60 | Master Plan 2019 SDCP Nature Boundary Line Layer | JSON GIS data for URA nature boundary lines. |
| 61 | Master Plan 2019 SDCP Park and Open Space Layer | JSON GIS data for URA park and open space areas. |
| 63 | Vessel Arrival Declaration by CallSign | Arrival declaration records by call sign: vessel identity, location/grid, purpose, agent, reported arrival time, crew, and passengers. |
| 64 | DepthsL | ZIP file containing depths line GIS data. |
| 65 | Vessel Departure Declaration by IMO Number | Departure declaration records: `vesselParticulars`, location/grid, purpose, agent, `reportedArrivalTime`, `reportedDepartureTime`, crew, pax. |
| 67 | Vessel Particulars by CallSign | Vessel particulars by call sign: identity, flag, dimensions, vessel type, tonnage, deadweight, MMSI, year built, and Singapore ownership/manager fields when available. |
| 68 | CulturalFeaturesP | ZIP file containing cultural feature point GIS data. |
| 69 | Vessel Departure Declaration by CallSign | Departure declaration records by call sign with vessel identity, location/grid, purpose, agent, reported arrival/departure times, crew, and passengers. |
| 70 | NaturalFeaturesL | ZIP file containing natural feature line GIS data. |
| 72 | Port Clearance Cert by Vessel Name | Port clearance certificate details by vessel name: vessel identity, certificate number, GDV number, departure time, issue time, expiry time, and port/berth details. |
| 74 | NaturalFeaturesP | ZIP file containing natural feature point GIS data. |
| 77 | Vessel Arrivals by Date | Arrival records for a date: `vesselParticulars`, `arrivedTime`, `locationFrom`, `locationTo`. |
| 78 | CulturalFeaturesL | ZIP file containing cultural feature line GIS data. |
| 79 | Location Codes CSV ZIP | ZIP file containing location code reference data in CSV format. |
| 80 | Vessels Due to Depart by Date | Scheduled departure records: `vesselParticulars`, `dueToDepart`, and related location details. |
| 81 | MilitaryFeaturesA | ZIP file containing military feature area GIS data. |
| 82 | Vessel Type JSON ZIP | ZIP file containing vessel type reference data in JSON format. |
| 83 | AidsToNavigationP | ZIP file containing aids-to-navigation point GIS data. |
| 84 | Vessel Departure Declaration by Date | Departure declaration records for a date: vessel identity, location/grid, purpose, agent, reported arrival/departure times, crew, and passengers. |
| 85 | SRS Certificate by Certificate Number | Singapore Registry of Ships certificate details by certificate number, including vessel identity, registration/validity dates, closure date, issue date, and certificate number. |

