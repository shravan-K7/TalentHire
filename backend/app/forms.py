import json
from django import forms
from .models import ArtistProfile

class LoginForm(forms.Form):
    username_or_email = forms.CharField(
        max_length=254,
        required=True,
    )

    password = forms.CharField(
        required=True,
        strip=False,
        widget=forms.PasswordInput,
    )

    def clean_username_or_email(self):
        value = self.cleaned_data.get("username_or_email", "").strip()

        if not value:
            raise forms.ValidationError(
                "Username or email is required."
            )

        return value

class ArtistProfileForm(forms.ModelForm):
    years_of_experience = forms.IntegerField(
        required=False,
        min_value=0,
        max_value=100,
        initial=0,
    )

    class Meta:
        model = ArtistProfile
        fields = [
            "stage_name",
            "category",
            "gender",
            "bio",
            "location",
            "phone",
            "profile_image",
            "starting_price",
            "years_of_experience",
            "performance_types",
            "travel_availability",
            "portfolio_url",
            "additional_information",
        ]

        widgets = {
            "stage_name": forms.TextInput(attrs={
                "placeholder": "Enter your stage name",
                "class": "form-control",
            }),
            "category": forms.Select(attrs={
                "class": "form-select",
            }),
            "gender": forms.Select(attrs={
                "class": "form-select",
            }),
            "bio": forms.Textarea(attrs={
                "placeholder": "Describe your talent and experience",
                "rows": 4,
                "class": "form-control",
            }),
            "location": forms.TextInput(attrs={
                "placeholder": "Enter your city or location",
                "class": "form-control",
            }),
            "phone": forms.TextInput(attrs={
                "placeholder": "Enter your phone number",
                "class": "form-control",
            }),
            "starting_price": forms.NumberInput(attrs={
                "min": "0",
                "placeholder": "Starting price in ₹",
                "class": "form-control",
            }),
            "years_of_experience": forms.NumberInput(attrs={
                "min": "0",
                "class": "form-control",
            }),
            "performance_types": forms.HiddenInput(),
            "travel_availability": forms.Select(attrs={
                "class": "form-select",
            }),
            "portfolio_url": forms.URLInput(attrs={
                "placeholder": "https://...",
                "class": "form-control",
            }),
            "additional_information": forms.Textarea(attrs={
                "placeholder": "Languages, special skills, equipment...",
                "rows": 3,
                "class": "form-control",
            }),
        }

    def clean_years_of_experience(self):
        years = self.cleaned_data.get("years_of_experience", 0)
        if years is None:
            years = 0
        if years > 100:
            raise forms.ValidationError(
                "Please enter a valid number of experience years."
            )
        return years

    def clean_performance_types(self):
        types = self.cleaned_data.get("performance_types")
        if isinstance(types, str):
            try:
                types = json.loads(types)
            except (json.JSONDecodeError, TypeError):
                types = []
        if not isinstance(types, list):
            types = []
        return types
