import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export default class BlockPrefab {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.physics = this.experience.physics


        this.instances = [] // Guardamos las instancias para actualizar sus físicas

        // Crear y cargar Web Worker
        this.worker = new Worker(new URL('../../workers/rotacionWorker.js', import.meta.url))
        this.worker.onmessage = (e) => {
            // Recibe datos del worker y actualiza rotación de objetos
            e.data.resultados.forEach(({ id, rotationY }) => {
                const obj = this.instances[id]
                if (obj) {
                    obj.mesh.rotation.y = rotationY
                }
            })
        }
        // Loop de actualización continua si está en modo paralelo
        setInterval(() => {
            const monitor = this.experience.monitor
            const modoParalelo = monitor?.data?.modoEjecucion === 'Paralelo'

            if (modoParalelo) {
                const objetos = this.instances.map((b, i) => ({
                    id: i,
                    rotation: b.mesh.rotation.y
                }))
                this.worker.postMessage({ objetos })
            }
        }, 33) // ~30 veces por segundo
    }

    getInstance(position = { x: 0, y: 0, z: 0 }) {
        // Crear geometría y color únicos por instancia
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
        const randomColor = new THREE.Color(Math.random(), Math.random(), Math.random())
        const material = new THREE.MeshStandardMaterial({ color: randomColor })

        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.position.set(position.x, position.y, position.z)
        this.scene.add(mesh)

        const shape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25))
        const body = new CANNON.Body({
            mass: 0.2,
            shape: shape,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            linearDamping: 0.9
        })
        this.physics.world.addBody(body)

        this.instances.push({ mesh, body })

        return mesh
    }

    addMany(count = 500) {
        const monitor = this.experience.monitor
        const menu = this.experience.menu

        monitor.marcarInicio()
        menu?.setStatus?.('⏳ Agregando bloques...')

        let i = 0
        const batchSize = 25
        const positions = []

        const createBatch = () => {
            for (let j = 0; j < batchSize && i < count; j++, i++) {
                const x = (Math.random() - 0.5) * 100
                const y = Math.random() * 5 + 1
                const z = (Math.random() - 0.5) * 100
                this.getInstance({ x, y, z })
                positions.push({ id: this.instances.length - 1, rotation: 0 })
            }
            this.updatePanelBlockCount()
            if (i < count) {
                requestAnimationFrame(createBatch)
            } else {
                if (monitor.data.modoEjecucion === 'Paralelo') {
                    this.worker.postMessage({ objetos: positions })
                }
                monitor.marcarFin()
                menu?.setStatus?.(`✔️ Se agregaron ${count} bloques`)
            }
        }

        createBatch()
    }



    update() {
        this.instances.forEach(({ mesh, body }) => {
            mesh.position.copy(body.position)
            mesh.quaternion.copy(body.quaternion)
        })
    }

    updatePanelBlockCount() {
        const raycaster = this.experience.raycaster
        raycaster.blockControls.total = this.instances.length
        raycaster.totalController?.updateDisplay?.()
    }

}
