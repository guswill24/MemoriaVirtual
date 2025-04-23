import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { gsap } from 'gsap'

export default class Raycaster {
    constructor(experience, gui) {
        this.experience = experience
        this.scene = this.experience.scene
        this.camera = this.experience.camera.instance
        this.renderer = this.experience.renderer.instance
        this.physics = this.experience.physics
        this.pointer = new THREE.Vector2()
        this.raycaster = new THREE.Raycaster()
        this.spawnedObstacles = []
        this.sharedGeometry = new THREE.SphereGeometry(0.25, 32, 32)

        // 🎛️ Controles y monitoreo
        this.blockControls = {
            total: 0,
            add10Blocks: () => this.addMoreBlocks(500),
            removeAll: () => this.removeAllObstacles(),
            memoryUsedMB: 0
        }

        const folder = gui.addFolder('🧱 Bloques')
        folder.add(this.blockControls, 'add10Blocks').name('➕ Agregar 500')
        folder.add(this.blockControls, 'removeAll').name('🧹 Eliminar todos')
        this.totalController = folder.add(this.blockControls, 'total').name('🔢 Total')
        this.totalController.disable()
        this.memoryController = folder.add(this.blockControls, 'memoryUsedMB').name('📊 RAM JS (MB)')
        this.memoryController.disable()

        this.setEvents()
        this._startMemoryTracking()
    }

    setEvents() {
        window.addEventListener('click', (event) => {
            this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
            this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1

            this.raycaster.setFromCamera(this.pointer, this.camera)
            const floorMesh = this.experience.world?.floor?.mesh
            if (!floorMesh) return

            const intersects = this.raycaster.intersectObject(floorMesh)
            if (intersects.length > 0) {
                const point = intersects[0].point
                console.log('🟢 Punto seleccionado:', point)
            }
        })
    }

    addMoreBlocks(count) {
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 200
            const z = (Math.random() - 0.5) * 200
            const y = 1
            this._createObstacle(x, y, z)
        }
        this._updateBlockCount()
    }

    _createObstacle(x, y, z) {
        const radius = 0.25

        const color = new THREE.Color(Math.random(), Math.random(), Math.random())
        const material = new THREE.MeshStandardMaterial({ color })
        const geometry = this.sharedGeometry
        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true
        mesh.position.set(x, y, z)
        this.scene.add(mesh)

        const shape = new CANNON.Sphere(radius)
        const body = new CANNON.Body({
            mass: 1,
            shape,
            position: new CANNON.Vec3(x, y, z),
            material: this.physics.defaultMaterial
        })
        this.physics.world.addBody(body)

        const tick = () => {
            mesh.position.copy(body.position)
            mesh.quaternion.copy(body.quaternion)
        }
        this.experience.time.on('tick', tick)

        this.spawnedObstacles.push({ mesh, body, tick })
        this._updateBlockCount()
    }

    _removeObstacle({ mesh, body, tick }) {
        gsap.to(mesh.scale, { x: 0, y: 0, z: 0, duration: 0.4, ease: 'power1.in' })
        gsap.to(mesh.material, {
            opacity: 0,
            duration: 0.4,
            ease: 'power1.in',
            onComplete: () => {
                this.scene.remove(mesh)
                mesh.geometry.dispose()
                mesh.material.dispose()
                this.physics.world.removeBody(body)
                this.experience.time.off('tick', tick)
                this._updateBlockCount()
            }
        })
        mesh.material.transparent = true
    }

    removeAllObstacles() {
        this.spawnedObstacles.forEach(obj => this._removeObstacle(obj))
        this.spawnedObstacles = []
        this._updateBlockCount()
    }

    _updateBlockCount() {
        this.blockControls.total = this.spawnedObstacles.length
        this.totalController.updateDisplay()
    }

    _startMemoryTracking() {
        setInterval(() => {
            if (performance && performance.memory) {
                const mem = performance.memory.usedJSHeapSize / 1048576
                this.blockControls.memoryUsedMB = mem.toFixed(2)
                this.memoryController.updateDisplay()
            }
        }, 1000)
    }
}
