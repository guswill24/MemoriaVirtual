import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { createBoxShapeFromModel, createTrimeshShapeFromModel } from '../Experience/Utils/PhysicsShapeFactory.js'
import Prize from '../Experience/World/Prize.js'

export default class ToyCarLoader {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.physics = this.experience.physics
        this.prizes = []
    }

    async loadFromAPI() {
        try {
            // 🔧 Cargar lista de modelos que requieren Trimesh (precisión física)
            const listRes = await fetch('/config/precisePhysicsModels.json')
            const precisePhysicsModels = await listRes.json()

            // ✅ Cargar siempre desde archivo local
            const localRes = await fetch('/data/threejs_blocks.blocks.json')
            const blocks = await localRes.json()
            //console.log('📦 Datos cargados desde archivo local:', blocks.length)

            blocks.forEach(block => {
                if (!block.name) {
                    console.warn('🛑 Bloque sin nombre:', block)
                    return
                }

                const resourceKey = block.name
                const glb = this.resources.items[resourceKey]

                if (!glb) {
                    console.warn(`🛑 Modelo no encontrado: ${resourceKey}`)
                    return
                }

                const model = glb.scene.clone()

                // 🎯 Cargar imagen a cartel si existe
                const cube = this.scene.getObjectByName('Cube')
                if (cube) {
                    const textureLoader = new THREE.TextureLoader()
                    const texture = textureLoader.load('/textures/ima1.jpg', () => {
                        texture.encoding = THREE.sRGBEncoding
                        texture.wrapS = THREE.ClampToEdgeWrapping
                        texture.wrapT = THREE.ClampToEdgeWrapping
                        texture.anisotropy = this.experience.renderer.instance.capabilities.getMaxAnisotropy()
                        texture.center.set(0.5, 0.5)
                        texture.rotation = -Math.PI / 2

                        cube.material = new THREE.MeshBasicMaterial({
                            map: texture,
                            side: THREE.DoubleSide
                        })
                        cube.material.needsUpdate = true
                    })
                }

                // 🎯 Premios
                if (block.name.startsWith('coin')) {
                    const prize = new Prize({
                        model,
                        position: new THREE.Vector3(block.x, block.y, block.z),
                        scene: this.scene
                    })
                    this.prizes.push(prize)
                    this.scene.add(prize.model)
                    return
                }

                this.scene.add(model)

                // ⚙️ Crear cuerpo físico
                let shape
                let position = new THREE.Vector3()

                if (precisePhysicsModels.includes(block.name)) {
                    shape = createTrimeshShapeFromModel(model)
                    if (!shape) {
                        console.warn(`❌ No se pudo crear Trimesh para ${block.name}`)
                        return
                    }
                    position.set(0, 0, 0)
                } else {
                    shape = createBoxShapeFromModel(model, 0.9)
                    const bbox = new THREE.Box3().setFromObject(model)
                    const center = new THREE.Vector3()
                    const size = new THREE.Vector3()
                    bbox.getCenter(center)
                    bbox.getSize(size)
                    center.y -= size.y / 2
                    position.copy(center)
                }

                const body = new CANNON.Body({
                    mass: 0,
                    shape: shape,
                    position: new CANNON.Vec3(position.x, position.y, position.z),
                    material: this.physics.obstacleMaterial
                })

                this.physics.world.addBody(body)
            })

        } catch (err) {
            console.error('❌ Error al cargar bloques o lista Trimesh:', err)
        }
    }
}
