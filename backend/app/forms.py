from django import forms

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