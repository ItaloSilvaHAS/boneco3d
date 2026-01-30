import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// ======================
// CENA
// ======================
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff)

// ======================
// CÂMERA
// ======================
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 2, 4)

// ======================
// RENDERER
// ======================
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
document.body.appendChild(renderer.domElement)

// ======================
// CONTROLES DE CÂMERA
// ======================
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.minDistance = 1.5
controls.maxDistance = 10
controls.minPolarAngle = 0
controls.maxPolarAngle = Math.PI
controls.target.set(0, 1, 0)
controls.update()

// ======================
// LUZ
// ======================
scene.add(new THREE.AmbientLight(0xffffff, 0.6))

const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(5, 10, 5)
scene.add(dirLight)

// ======================
// PLAYER
// ======================
let player
let mixer
const clock = new THREE.Clock()

const loader = new FBXLoader()
loader.load('/Model/characterMedium.fbx', (model) => {
  player = model

  // FBX SEMPRE VEM GIGANTE
  player.scale.setScalar(0.01)
  player.position.set(0, 0, 0)

  scene.add(player)

  // SE O MODELO TIVER ANIMAÇÃO EMBUTIDA
  if (model.animations.length > 0) {
    mixer = new THREE.AnimationMixer(player)
    const action = mixer.clipAction(model.animations[0])
    action.play()
  }
})

// ======================
// INPUT (WASD)
// ======================
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
}

window.addEventListener('keydown', (e) => {
  if (keys[e.key] !== undefined) keys[e.key] = true
})

window.addEventListener('keyup', (e) => {
  if (keys[e.key] !== undefined) keys[e.key] = false
})

// ======================
// LOOP
// ======================
function animate() {
  requestAnimationFrame(animate)

  const delta = clock.getDelta()

  if (mixer) mixer.update(delta)

  if (player) {
    const speed = 2.5 * delta

    if (keys.w) {
      player.position.z -= speed
      player.rotation.y = Math.PI
    }
    if (keys.s) {
      player.position.z += speed
      player.rotation.y = 0
    }
    if (keys.a) {
      player.position.x -= speed
      player.rotation.y = -Math.PI / 2
    }
    if (keys.d) {
      player.position.x += speed
      player.rotation.y = Math.PI / 2
    }
  }

  controls.update()
  renderer.render(scene, camera)
}

animate()

// ======================
// RESIZE
// ======================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
