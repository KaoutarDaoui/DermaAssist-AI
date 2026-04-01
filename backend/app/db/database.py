from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from urllib.parse import unquote
from app.core.config import settings


def build_db_url(url: str) -> str:
    """
    Reconstruit l'URL de connexion en décodant proprement le mot de passe.
    Gère les mots de passe contenant des @ encodés en %40 (ex: DermaAssist@@@333).
    Stratégie : rfind('@') trouve toujours le dernier @ qui sépare
    le bloc user:password du bloc host:port/dbname.
    """
    decoded = unquote(url)

    if "://" not in decoded:
        return url

    prefix, rest = decoded.split("://", 1)

    # Le DERNIER @ sépare toujours userinfo du hostinfo
    at_idx = rest.rfind("@")
    if at_idx == -1:
        return url

    userinfo = rest[:at_idx]       # "user:password"
    hostinfo = rest[at_idx + 1:]   # "host:port/dbname"

    # Reconstruire une URL propre avec le mot de passe re-encodé
    # On encode uniquement les @ dans le mot de passe → %40
    colon_idx = userinfo.index(":")
    user     = userinfo[:colon_idx]
    password = userinfo[colon_idx + 1:].replace("@", "%40")

    return f"{prefix}://{user}:{password}@{hostinfo}"


# URL propre avec mot de passe correctement encodé
_db_url = build_db_url(settings.DATABASE_URL)

# Créer le moteur de base de données
if "sqlite" in _db_url:
    engine = create_engine(
        _db_url,
        echo=settings.DEBUG,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        _db_url,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        connect_args={"sslmode": "require"},  # Supabase exige SSL
    )

# Créer la factory de session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Classe de base pour les modèles
Base = declarative_base()


def get_db():
    """Dépendance pour obtenir une session de base de données."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()