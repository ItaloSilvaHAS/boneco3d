import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// ======================
// CONFIGURAÇÕES
// ======================
const config = {
  speed: 2.5,
  rotationSpeed: 10,
  cameraOffset: new THREE.Vector3(0, 2.5, 4.5), // Aumentado Y de 1.8 para 2.5 e Z de 3.5 para 4.5
  lookAtOffset: new THREE.Vector3(0, 1.8, 0),    // Aumentado Y de 1.5 para 1.8
  cameraSmooth: 0.1,
  modelScale: 0.01,
  skinPath: '/Skins/skaterMaleA.png',
  modelPath: '/Model/characterMedium.fbx',
  animations: {
    idle: '/Animations/idle.fbx',
    run: '/Animations/run.fbx',
    jump: '/Animations/jump.fbx'
  }
}

// ======================
// CENA
// ======================
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xa0a0a0)
scene.fog = new THREE.Fog(0xa0a0a0, 10, 50)

// Chao
const mesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }))
mesh.rotation.x = - Math.PI / 2
mesh.receiveShadow = true
scene.add(mesh)

const grid = new THREE.GridHelper(100, 40, 0x000000, 0x000000)
grid.material.opacity = 0.2
grid.material.transparent = true
scene.add(grid)

// ======================
// CÂMERA
// ======================
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 3, 5)

// ======================
// RENDERER
// ======================
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

// ======================
// LUZ
// ======================
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5)
hemiLight.position.set(0, 20, 0)
scene.add(hemiLight)

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
dirLight.position.set(3, 10, 10)
dirLight.castShadow = true
scene.add(dirLight)

// ======================
// CONTROLES DE CÂMERA
// ======================
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.minDistance = 2
controls.maxDistance = 10
controls.enablePan = false
controls.maxPolarAngle = Math.PI / 1.8
controls.minPolarAngle = Math.PI / 4
controls.enableZoom = true

// Variáveis de controle de câmera manual
let cameraAzimuth = 0
let cameraPolar = Math.PI / 3
const mouseSensitivity = 0.002

window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === renderer.domElement) {
    cameraAzimuth -= e.movementX * mouseSensitivity
    cameraPolar = Math.max(Math.PI / 4, Math.min(Math.PI / 1.8, cameraPolar + e.movementY * mouseSensitivity))
  }
})

renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock()
})

// ======================
// PLAYER & ANIMAÇÕES
// ======================
let player, mixer
const animations = {}
let currentAction, activeAction
const clock = new THREE.Clock()

const textureLoader = new THREE.TextureLoader()
const fbxLoader = new FBXLoader()

// Carregar Modelo
fbxLoader.load(config.modelPath, (object) => {
  player = object
  player.scale.setScalar(config.modelScale)
  player.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
      // Aplicar Textura
      if (config.skinPath) {
        child.material.map = textureLoader.load(config.skinPath)
      }
    }
  })
  scene.add(player)

  mixer = new THREE.AnimationMixer(player)
  
  // Carregar Animações
  const loadAnim = (name, path) => {
    fbxLoader.load(path, (anim) => {
      const clip = anim.animations[0]
      if (!clip) return
      
      const action = mixer.clipAction(clip)
      animations[name] = action
      
      // Ajustar loop e influência
      action.setEffectiveWeight(1.0)
      action.setEffectiveTimeScale(1.0)
      
      if (name === 'idle') {
        action.play()
        activeAction = action
      }
    })
  }

  Object.entries(config.animations).forEach(([name, path]) => loadAnim(name, path))
})

// ======================
// INPUT
// ======================
const keys = { w: false, a: false, s: false, d: false }
window.addEventListener('keydown', (e) => { if (keys[e.key.toLowerCase()] !== undefined) keys[e.key.toLowerCase()] = true })
window.addEventListener('keyup', (e) => { if (keys[e.key.toLowerCase()] !== undefined) keys[e.key.toLowerCase()] = false })

function fadeToAction(name, duration = 0.2) {
  const nextAction = animations[name]
  if (!nextAction || nextAction === activeAction) return

  // Forçar parada de todas as outras animações para evitar conflitos (T-Pose)
  Object.values(animations).forEach(action => {
    if (action !== nextAction) action.fadeOut(duration)
  })

  nextAction.reset().fadeIn(duration).play()
  activeAction = nextAction
}

// ======================
// LOOP
// ======================
function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()

  if (mixer) mixer.update(delta)

  if (player) {
    const moveDir = new THREE.Vector3()
    
    // Movimentação baseada na câmera
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    right.y = 0
    right.normalize()

    if (keys.w) moveDir.add(forward)
    if (keys.s) moveDir.sub(forward)
    if (keys.a) moveDir.sub(right)
    if (keys.d) moveDir.add(right)

    if (moveDir.length() > 0) {
      moveDir.normalize()
      
      // Rotação do player para a direção do movimento
      const targetRotation = Math.atan2(moveDir.x, moveDir.z)
      const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation)
      player.quaternion.slerp(quaternion, config.rotationSpeed * delta)

      // Movimento
      player.position.add(moveDir.multiplyScalar(config.speed * delta))

      fadeToAction('run')
    } else {
      fadeToAction('idle')
    }

    // CÂMERA ESTILO TPS (The Last of Us)
    // A câmera segue o player com um offset baseado na rotação da câmera (mouse)
    const idealOffset = new THREE.Vector3(0, config.cameraOffset.y, config.cameraOffset.z)
    idealOffset.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(cameraPolar - Math.PI/2, cameraAzimuth, 0)))
    
    const targetCameraPos = player.position.clone().add(idealOffset)
    camera.position.lerp(targetCameraPos, config.cameraSmooth)
    
    const lookAtPos = player.position.clone().add(config.lookAtOffset)
    camera.lookAt(lookAtPos)
    
    // Atualiza o alvo do OrbitControls para manter sincronia se necessário
    controls.target.copy(lookAtPos)
  }

  // controls.update() // Desativado para controle manual TPS, mas mantido se quiser alternar
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
