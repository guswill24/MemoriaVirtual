import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { gsap } from 'gsap'
import BlockPrefab from '../World/BlockPrefab.js'

export default class Raycaster {
    constructor(experience, gui) {
        this.experience = experience
        this.scene = this.experience.scene
        this.camera = this.experience.camera.instance
        this.renderer = this.experience.renderer.instance
        this.physics = this.experience.physics
        this.pointer = new THREE.Vector2()
        this.raycaster = new THREE.Raycaster()

        // 🧱 Usamos BlockPrefab para los bloques
        this.blockPrefab = new BlockPrefab(this.experience)

        // 🎛️ Controles y monitoreo
        this.blockControls = {
            total: 0,
            add10Blocks: () => this.addMoreBlocks(500),
            removeAll: () => this.removeAllObstacles(),
            memoryUsedMB: 0
        }

        const folder = gui.addFolder('🧱  Bloques')
        folder.add(this.blockControls, 'add10Blocks').name('➕ Agregar 500')
        folder.add(this.blockControls, 'removeAll').name('🧹 Eliminar todos')
        this.totalController = folder.add(this.blockControls, 'total').name('🔢 Total Bloques')
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
                //console.log('🟢 Punto seleccionado:', point)
            }
        })
    }

    addMoreBlocks(count) {
        this.blockPrefab.addMany(count)
        this._updateBlockCount(this.blockPrefab.instances.length)
    }

    removeAllObstacles() {
        // Eliminar todos los bloques creados por BlockPrefab
        this.blockPrefab.instances.forEach(({ mesh, body }) => {
            this.scene.remove(mesh)
        
            // Verificar que geometry y material existan
            if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
                mesh.geometry.dispose()
            }
            if (mesh.material && typeof mesh.material.dispose === 'function') {
                mesh.material.dispose()
            }
        
            this.physics.world.removeBody(body)
        })
        
        this.blockPrefab.instances = []
        this._updateBlockCount(0)
    }

    _updateBlockCount(total = 0) {
        this.blockControls.total = total
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
