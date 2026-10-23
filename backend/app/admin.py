from django.contrib import admin

from .models import Artist


@admin.register(Artist)
class ArtistAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "location", "price")
    list_filter = ("category", "location")
    search_fields = ("name", "category", "location")