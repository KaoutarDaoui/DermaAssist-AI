from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from enum import Enum


class FitzpatrickType(str, Enum):
    TYPE_I = "I"
    TYPE_II = "II"
    TYPE_III = "III"
    TYPE_IV = "IV"
    TYPE_V = "V"
    TYPE_VI = "VI"


class AlgerianWilaya(str, Enum):
    """Wilayas (Provinces) of Algeria - 69 administrative divisions"""
    ADRAR = "Adrar"
    CHLEF = "Chlef"
    LAGHOUAT = "Laghouat"
    OUM_EL_BOUAGHI = "Oum El Bouaghi"
    BATNA = "Batna"
    BEJAIA = "Béjaïa"
    BISKRA = "Biskra"
    BECHAR = "Béchar"
    BLIDA = "Blida"
    BOUIRA = "Bouira"
    TAMANRASSET = "Tamanrasset"
    TLEMCEN = "Tlemcen"
    TIARET = "Tiaret"
    TIZI_OUZOU = "Tizi Ouzou"
    ALGIERS = "Algiers"
    DJELFA = "Djelfa"
    JIJEL = "Jijel"
    SETIF = "Sétif"
    SAIDA = "Saïda"
    SKIKDA = "Skikda"
    SIDI_BEL_ABBES = "Sidi Bel Abbès"
    ANNABA = "Annaba"
    GUELMA = "Guelma"
    CONSTANTINE = "Constantine"
    MEDEA = "Médéa"
    MOSTAGANEM = "Mostaganem"
    MSILA = "M'Sila"
    MASCARA = "Mascara"
    OUARGLA = "Ouargla"
    ORAN = "Oran"
    EL_BAYADH = "El Bayadh"
    ILLIZI = "Illizi"
    BORDJ_BOU_ARRERIDJ = "Bordj Bou Arréridj"
    BOUMERDES = "Boumerdès"
    EL_TARF = "El Tarf"
    TINDOUF = "Tindouf"
    TISSEMSILT = "Tissemsilt"
    EL_OUED = "El Oued"
    KHENCHELA = "Khenchela"
    SOUK_AHRAS = "Souk Ahras"
    TIPAZA = "Tipaza"
    MILA = "Mila"
    AIN_DEFLA = "Aïn Defla"
    NAAMA = "Naâma"
    AIN_TEMOUCHENT = "Aïn Témouchent"
    GHARDAIA = "Ghardaïa"
    RELIZANE = "Relizane"
    DRAA_BEN_KHEDDA = "Drâa Ben Khedda"
    BENI_MESSOUS = "Béni Messous"
    TEBESSA = "Tébessa"
    AFLOU = "Aflou"
    BARIKA = "Barika"
    EL_KANTARA = "El Kantara"
    BIR_EL_ATER = "Bir El Ater"
    EL_ARICHA = "El Aricha"
    KSAR_CHELLALA = "Ksar Chellala"
    AIN_OUSSERA = "Aïn Oussera"
    MESSAAD = "Messaad"
    KSAR_EL_BOUKHARI = "Ksar El Boukhari"
    BOU_SAADA = "Bou Saâda"
    EL_ABIODH_SIDI_CHEIKH = "El Abiodh Sidi Cheikh"
    SABAYA = "Sabaya"


class PatientBase(BaseModel):
    birth_date: Optional[date] = None
    full_name: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    fitzpatrick_type: Optional[FitzpatrickType] = FitzpatrickType.TYPE_IV
    city: Optional[AlgerianWilaya] = None
    medical_history: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(PatientBase):
    pass


class PatientResponse(PatientBase):
    id: str
    user_id: str
    doctor_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PatientSelf(PatientResponse):
    """Réponse limitée pour GET /patients/me"""
    pass
