import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from app.models import City, Country, District, State


class Command(BaseCommand):
    help = "Idempotently seed Indian States, Union Territories, Districts, and Cities/Towns."

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            type=str,
            default=str(
                Path(__file__).resolve().parents[2] / "data" / "indian_locations.json"
            ),
            help="Path to the Indian locations JSON dataset.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dataset_path = Path(options["file"])
        if not dataset_path.exists():
            self.stderr.write(self.style.ERROR(f"Dataset file not found: {dataset_path}"))
            return

        with dataset_path.open("r", encoding="utf-8") as fh:
            payload = json.load(fh)

        country_info = payload["country"]
        country, country_created = Country.objects.get_or_create(
            code=country_info["code"],
            defaults={"name": country_info["name"]},
        )
        if not country_created and country.name != country_info["name"]:
            country.name = country_info["name"]
            country.save(update_fields=["name"])

        states_created = 0
        districts_created = 0
        cities_created = 0

        for state_item in payload.get("states", []):
            state_obj, s_created = State.objects.get_or_create(
                country=country,
                name=state_item["name"],
                defaults={
                    "code": state_item.get("code", ""),
                    "is_union_territory": bool(state_item.get("is_union_territory", False)),
                },
            )
            if s_created:
                states_created += 1
            else:
                updated_fields = []
                new_code = state_item.get("code", "")
                new_ut = bool(state_item.get("is_union_territory", False))
                if state_obj.code != new_code:
                    state_obj.code = new_code
                    updated_fields.append("code")
                if state_obj.is_union_territory != new_ut:
                    state_obj.is_union_territory = new_ut
                    updated_fields.append("is_union_territory")
                if updated_fields:
                    state_obj.save(update_fields=updated_fields)

            for district_name, city_names in state_item.get("districts", {}).items():
                district_obj, d_created = District.objects.get_or_create(
                    state=state_obj,
                    name=district_name,
                )
                if d_created:
                    districts_created += 1

                for city_name in city_names:
                    _, c_created = City.objects.get_or_create(
                        district=district_obj,
                        name=city_name,
                        defaults={"state": state_obj},
                    )
                    if c_created:
                        cities_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed complete for {country.name}: "
                f"States/UTs={State.objects.filter(country=country).count()} (+{states_created}), "
                f"Districts={District.objects.filter(state__country=country).count()} (+{districts_created}), "
                f"Cities={City.objects.filter(state__country=country).count()} (+{cities_created})."
            )
        )
