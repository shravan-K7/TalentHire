from django.db import migrations

DEFAULT_CATEGORIES = [
    {"name": "Singers & Vocalists", "description": "Classical, Bollywood, Pop, Jazz, Rock and acoustic solo vocalists."},
    {"name": "Dance Groups", "description": "Hip-hop crews, classical fusion, contemporary, and high-energy stage dancers."},
    {"name": "Live DJs & Producers", "description": "Club, EDM, techno, wedding DJs, and open-format master turntablists."},
    {"name": "Orchestra & Instrumental", "description": "Symphonies, string quartets, fusion instrumentalists, flautists, and sitar masters."},
    {"name": "Anchors & Emcees", "description": "Engaging corporate hosts, bilingual emcees, and energetic stage moderators."},
    {"name": "Live Bands & Ensembles", "description": "Indie rock, pop cover bands, sufi fusion, and brass marching ensembles."},
]

def seed_categories(apps, schema_editor):
    Category = apps.get_model("app", "Category")
    for item in DEFAULT_CATEGORIES:
        Category.objects.get_or_create(name=item["name"], defaults={"description": item["description"]})

def rollback_categories(apps, schema_editor):
    Category = apps.get_model("app", "Category")
    Category.objects.filter(name__in=[item["name"] for item in DEFAULT_CATEGORIES]).delete()

class Migration(migrations.Migration):

    dependencies = [
        ("app", "0004_artistprofile_additional_information_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_categories, rollback_categories),
    ]

