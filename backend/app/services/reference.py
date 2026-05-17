from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reference import ReferenceData

CURATED_REFERENCE = {
    "flag_country": {
        "PA": "Panama",
        "LR": "Liberia",
        "SG": "Singapore",
    },
    "vessel_type": {
        "BA": "Barge",
        "BAAC": "Accommodation/Pipe Laying Barge",
        "BADR": "Dredger Barge",
        "BAFG": "Flat Top Deck Cargo Barge",
        "BAFL": "Flat Top Barge",
        "BAFW": "Flat Top Oil/Water Barge",
        "BAHA": "Hatch Barge",
        "BAHP": "Hopper Barge",
        "BAHT": "Heavy Transport Vessel",
        "BAJA": "Jack-Up Barge",
        "BAOI": "Oil Barge",
        "BAPI": "Piling Barge",
        "BASO": "Sludge/Slop Barge",
        "BAWO": "Work Barge",
        "BC": "Bulk Carrier",
        "BCCC": "Cement Carrier",
        "BCOB": "Ore/Bulk Carrier",
        "C2": "Container Ship-2nd Gen.",
        "C3": "Container Ship-3rd Gen.",
        "CC": "Vehicle Carrier",
        "CCCV": "Container Vehicle Carrier",
        "CCRR": "RoRo Car Carrier",
        "CF": "Container Ship-Feeder",
        "CH": "Chemical Tanker",
        "CL": "Cable Laying Ship",
        "CO": "Coaster",
        "CR": "Container Ship-Roll On/Off",
        "CS": "Container Ship",
        "CX": "Crane Barge",
        "DL": "Drill Ship",
        "DR": "Dredger",
        "DS": "Dead Ship",
        "FB": "Ferry Boat",
        "FBPC": "Passenger/Car Ferry",
        "FBPG": "Passenger/Cargo Ferry",
        "FBVF": "Passenger Vehicular Ferry",
        "FR": "General Cargo",
        "FRRR": "RoRo Cargo",
        "FS": "Factory Ship",
        "FV": "Fishing Vessel",
        "HS": "Heavyload Semi-Submersible",
        "IB": "Icebreaker",
        "JU": "Junk",
        "LA": "LASH Vessel",
        "LC": "Landing Craft",
        "LI": "Lighter",
        "LN": "LNG",
        "LP": "LPG",
        "LU": "Passenger Launch",
        "LV": "Live-Stock Vessel",
        "NN": "Nuclear Power Vessel",
        "NV": "Naval Vessel",
        "OB": "Oil-Bulk-Ore Carrier",
        "OBOL": "Oil-Gas Carrier",
        "OR": "Oil Rig",
        "ORAC": "Accommodation Rig",
        "ORJA": "Jack-Up Rig",
        "ORSS": "Semi-Submersible Rig",
        "ORTE": "Tender Rig",
        "OT": "Others",
        "PL": "Passenger Vessel (D.C.)",
        "PM": "Motorised Pleasure Boat",
        "PMCB": "Cabin Cruiser",
        "PMCT": "Motorised Catamaran",
        "PMDI": "Motorised Dinghy",
        "PMFU": "Motorised Funboat",
        "PMHO": "Motorised Hovercraft",
        "PMHY": "Hydrofoil",
        "PMSB": "Ski-Boat",
        "PMSP": "Speedboat",
        "PMST": "Motorised Catamaran",
        "PMTR": "Motorised Trimaran",
        "PR": "Rowing Boat",
        "PRBA": "Powered Recreational Barge",
        "PRCA": "Canoe",
        "PRDI": "Rowing Dinghy",
        "PRFU": "Rowing Funboat",
        "PS": "Sailing Boat",
        "PSCT": "Catamaran",
        "PSDI": "Sailing Dinghy",
        "PSFU": "Sailing Funboat",
        "PSTR": "Trimaran",
        "PT": "Parcel Tanker",
        "PV": "Passenger Vessel",
        "PVHO": "Passenger Hovercraft",
        "RE": "Reefer Vessel",
        "RV": "Research/Survey Vessel",
        "SA": "Salvage Vessel",
        "SC": "Semi-Container Ship",
        "SM": "Sampan",
        "SMBG": "Big Motor Sampan",
        "SMBI": "Big Non-Motorised Sampan",
        "SMBM": "Bumboat",
        "SMMO": "Motor Sampan",
        "SMRO": "Rowing Sampan",
        "SMTO": "Tongkang",
        "SMTW": "Chinese Twako",
        "SR": "Submarine Support & Rescue",
        "SV": "Supply Vessel",
        "SVOF": "Offshore Supply Vessel",
        "TA": "Tanker",
        "TAAT": "Asphalt Tanker",
        "TABA": "Tanker Barge",
        "TABU": "Bunker Tanker",
        "TACG": "Chemical/Gas Tanker",
        "TACO": "Crude Oil Tanker",
        "TAFO": "Floating Storage Offshore",
        "TAFP": "FPSO Vessel",
        "TAFU": "Floating Storage Unit",
        "TAFX": "Floating Storage Regas. Unit",
        "TALG": "Liquefied Gas Carrier",
        "TAMO": "Mobile Offshore Production Unit",
        "TAOC": "Oil/Chemical/Gas Tanker",
        "TAP1": "Petroleum Product Tanker (>=60C)",
        "TAP2": "Petroleum Product Tanker (<60C)",
        "TAP3": "Petroleum Product Tanker (<=60C)",
        "TAPC": "Petroleum/Chemical Tanker",
        "TAUL": "ULCC",
        "TAVL": "VLCC",
        "TAVO": "Vegetable Oil Tanker",
        "TAWA": "Water Tanker",
        "TAWD": "Wooden Bunker Craft",
        "TS": "Training Ship",
        "TU": "Tug Boat",
        "TUCC": "Supply Vessel/ Cement Carrier",
        "TUPU": "Pusher Tug",
        "TUSV": "Tug/Supply Vessel",
        "UT": "Utility Vessel",
        "UTDV": "Diving Support Vessel",
        "UTOS": "Oil Spill Response Vessel",
        "WA": "Waterboat",
        "WB": "Workboat",
        "WBCB": "Crew Boat",
        "WG": "Wing In Ground Craft",
        "YA": "Yacht",
        "YA50": "International 505",
        "YACB": "Cabin Cruiser",
        "YACT": "Motorised Catamaran",
        "YAHO": "Motorised Hovercraft",
        "YAMO": "Motorised Yacht",
        "YASL": "Sailing Yacht",
        "YASP": "Speedboat",
        "YATR": "Motorised Trimaran",
        "YAWG": "Yacht-Wing In Ground Craft",
    },
    "entity_role": {
        "owner": "Owner",
        "operator": "Operator",
        "ship_manager": "Ship manager",
        "ism_manager": "ISM manager",
    },
}


class ReferenceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def ensure_curated(self) -> None:
        for domain, values in CURATED_REFERENCE.items():
            for code, label in values.items():
                existing = await self.session.scalar(
                    select(ReferenceData).where(ReferenceData.domain == domain, ReferenceData.code == code)
                )
                if existing is None:
                    self.session.add(
                        ReferenceData(
                            domain=domain,
                            code=code,
                            label=label,
                            description=None,
                            source="curated-reference",
                            raw_payload={"code": code, "label": label},
                        )
                    )
                elif existing.source == "curated-reference" and existing.label != label:
                    existing.label = label
                    existing.raw_payload = {"code": code, "label": label}
        await self.session.commit()

    async def list_domain(self, domain: str) -> list[ReferenceData]:
        await self.ensure_curated()
        rows = await self.session.scalars(
            select(ReferenceData).where(ReferenceData.domain == domain).order_by(ReferenceData.label)
        )
        return list(rows)

    async def summary(self) -> dict[str, int]:
        await self.ensure_curated()
        rows = await self.session.scalars(select(ReferenceData.domain))
        summary: dict[str, int] = {}
        for domain in rows:
            summary[domain] = summary.get(domain, 0) + 1
        return summary
