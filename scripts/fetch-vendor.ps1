$ErrorActionPreference = "Stop"
$vers = "0.159.0"
$base = "https://unpkg.com/three@$vers"
New-Item -ItemType Directory -Force -Path "vendor/three" | Out-Null
Invoke-WebRequest "$base/build/three.module.js" -OutFile "vendor/three/three.module.js"
Invoke-WebRequest "$base/examples/jsm/controls/OrbitControls.js" -OutFile "vendor/three/OrbitControls.js"
Invoke-WebRequest "$base/examples/jsm/loaders/GLTFLoader.js" -OutFile "vendor/three/GLTFLoader.js"
Write-Host "three.js vendor files downloaded."
