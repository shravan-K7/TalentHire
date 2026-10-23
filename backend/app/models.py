from django.db import models


class Artist(models.Model):
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    location = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return self.name