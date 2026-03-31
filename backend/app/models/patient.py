from sqlalchemy import Column, String, Date, Enum, ForeignKey, DateTime, Text, func, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
import uuid
import enum


class FitzpatrickType(str, enum.Enum):
    """Types de peau selon l'échelle de Fitzpatrick."""
    TYPE_I = "I"
    TYPE_II = "II"
    TYPE_III = "III"
    TYPE_IV = "IV"
    TYPE_V = "V"
    TYPE_VI = "VI"


class AlgerianWilaya(str, enum.Enum):
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


class Patient(Base):
    """Modèle pour les profils patients."""
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=True)
    full_name = Column(String(255), nullable=True)  # Full patient name
    birth_date = Column(Date, nullable=True)
    age = Column(Integer, nullable=True)  # Age (calculated and stored)
    phone = Column(String(20), nullable=True)  # Phone number
    fitzpatrick_type = Column(Enum(FitzpatrickType), nullable=True, default=FitzpatrickType.TYPE_IV)
    city = Column(Enum(AlgerianWilaya), nullable=True)  # Algerian wilayas
    medical_history = Column(Text, nullable=True)  # Antécédents médicaux
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    doctor = relationship("Doctor", back_populates="patients", lazy="select")
    consultations = relationship("Consultation", back_populates="patient", lazy="select")
    check_ins = relationship("CheckIn", back_populates="patient", lazy="select")
    advice = relationship("PatientAdvice", back_populates="patient", lazy="select")
    skin_images = relationship("SkinImage", back_populates="patient", lazy="select", cascade="all, delete-orphan")
    ai_results = relationship("AIResult", back_populates="patient", lazy="select")

    def get_age(self):
        """Calculate age from birth_date."""
        from datetime import date
        if not self.birth_date:
            return None
        today = date.today()
        age = today.year - self.birth_date.year
        if today.month < self.birth_date.month or (
            today.month == self.birth_date.month and today.day < self.birth_date.day
        ):
            age -= 1
        return age if age >= 0 else None

    def __repr__(self):
        return f"<Patient {self.id}>"
