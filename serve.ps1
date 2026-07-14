# ============================================================
# serve.ps1 — mini serveur HTTP statique pour tester le jeu en
# local sous Windows (les modules ES6 exigent un serveur HTTP).
#
# Usage : double-clique sur jouer.bat (le plus simple !)
#    ou : powershell -ExecutionPolicy Bypass -File serve.ps1
# (« .\serve.ps1 » tout court est bloqué par la politique
#  d'exécution de Windows — d'où l'option Bypass.)
# Puis ouvrir  http://localhost:8420  dans le navigateur.
#
# (Sur le NAS Synology, ce fichier est inutile : nginx/Web Station
# sert le dossier directement.)
# ============================================================

$port = 8420
$racine = $PSScriptRoot   # le dossier du jeu = le dossier de ce script

# Types MIME : indispensable pour que le navigateur accepte les
# modules JS (ils doivent être servis en text/javascript).
$mimes = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
  $listener.Start()
}
catch {
  Write-Host "Impossible d'ouvrir le port $port : un autre serveur tourne sans doute déjà."
  Write-Host "Essaie simplement d'ouvrir http://localhost:$port dans le navigateur."
  Read-Host "Appuie sur Entrée pour fermer"
  exit 1
}
Write-Host "Reef Defender servi sur http://localhost:$port  (Ctrl+C pour arrêter)"

try {
  while ($listener.IsListening) {
    $contexte = $listener.GetContext()
    $requete = $contexte.Request
    $reponse = $contexte.Response

    # try/catch par requête : une requête bizarre ne doit pas tuer le serveur
    try {
      # Chemin demandé -> fichier sur le disque ("/" -> index.html)
      $chemin = $requete.Url.AbsolutePath.TrimStart('/')
      if ([string]::IsNullOrEmpty($chemin)) { $chemin = 'index.html' }
      $fichier = Join-Path $racine $chemin

      # Sécurité : on refuse tout ce qui sortirait du dossier du jeu
      $complet = [System.IO.Path]::GetFullPath($fichier)
      if (-not $complet.StartsWith($racine, [System.StringComparison]::OrdinalIgnoreCase) -or
          -not (Test-Path $complet -PathType Leaf)) {
        $reponse.StatusCode = 404
      }
      else {
        $extension = [System.IO.Path]::GetExtension($complet).ToLower()
        if ($mimes.ContainsKey($extension)) { $reponse.ContentType = $mimes[$extension] }

        $octets = [System.IO.File]::ReadAllBytes($complet)
        $reponse.ContentLength64 = $octets.Length
        # Une requête HEAD demande seulement les en-têtes, jamais le contenu
        if ($requete.HttpMethod -ne 'HEAD') {
          $reponse.OutputStream.Write($octets, 0, $octets.Length)
        }
      }
    }
    catch {
      try { $reponse.StatusCode = 500 } catch {}
    }
    finally {
      try { $reponse.Close() } catch {}
    }
  }
}
finally {
  $listener.Stop()
}
