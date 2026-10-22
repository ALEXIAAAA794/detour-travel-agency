$source = Get-Content .\prisma\migration_complete.sql -Raw

# Retirer la création de la table destinations déjà existante.
$source = [regex]::Replace(
  $source,
  '(?s)-- CreateTable\r?\nCREATE TABLE "destinations" \(.*?\r?\n\);\r?\n\r?\n',
  ''
)

# Retirer l'index unique déjà présent sur destinations.
$source = [regex]::Replace(
  $source,
  '(?m)^-- CreateIndex\r?\nCREATE UNIQUE INDEX "destinations_name_country_unique".*\r?\n\r?\n',
  ''
)

Set-Content -Path .\prisma\migration_nouvelles_tables.sql -Value $source -Encoding utf8
Write-Host "Fichier de migration préparé."
