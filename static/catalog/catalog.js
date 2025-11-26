import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MindARThree } from "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js";

document.addEventListener("DOMContentLoaded", async () => {
  const mindarThree = new MindARThree({
    container: document.querySelector("#container"),
    imageTargetSrc: "/static/ar/visiting-card.mind", // твой .mind маркер
  });

  const { renderer, scene, camera } = mindarThree;
  renderer.domElement.style.touchAction = "none";

  const anchor = mindarThree.addAnchor(0);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
  scene.add(light);

  const loader = new GLTFLoader();

  let mannequin;      // сам манекен
  let currentClothes; // текущая одежда

  const loadMannequin = () =>
    new Promise((resolve, reject) => {
      loader.load(
        "/static/models/mannequin.glb",
        (gltf) => {
          mannequin = gltf.scene;
          mannequin.scale.set(0.5, 0.5, 0.5);
          mannequin.position.set(0, -0.2, 0);
          anchor.group.add(mannequin);
          resolve();
        },
        undefined,
        reject
      );
    });

  const loadClothes = (url) =>
    new Promise((resolve, reject) => {
      // убираем предыдущую одежду
      if (currentClothes) {
        mannequin.remove(currentClothes);
        currentClothes.traverse((node) => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            if (Array.isArray(node.material)) node.material.forEach(m => m.dispose());
            else node.material.dispose();
          }
        });
        currentClothes = null;
      }

      loader.load(
        url,
        (gltf) => {
          const clothes = gltf.scene;
          clothes.position.set(0, 0, 0); // подгони под манекен
          mannequin.add(clothes);
          currentClothes = clothes;
          resolve();
        },
        undefined,
        reject
      );
    });

  // Примитивная инфо-панель по аналогии с createTextPanel
  const createInfoPanel = (lines) => {
    const group = new THREE.Group();
    const height = 0.25 + 0.15 * lines.length;
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, height),
      new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.7 })
    );
    group.add(bg);

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 40px sans-serif";

    let y = 150;
    for (const line of lines) {
      ctx.fillText(line, canvas.width / 2, y);
      y += 60;
    }
    const texture = new THREE.CanvasTexture(canvas);
    const textPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, height),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    );
    textPlane.position.z = 0.01;
    group.add(textPlane);
    group.position.set(0, 0.6, 0.1);
    return group;
  };

  const infoPanel = createInfoPanel(["Образ 1", "Жакет", "Размер M"]);
  anchor.group.add(infoPanel);

  // === HTML-кнопки для смены одежды ===
  const makeBtn = (label) => {
    const el = document.createElement("button");
    el.textContent = label;
    Object.assign(el.style, {
      position: "fixed",
      padding: "10px 16px",
      background: "#2f80ed",
      color: "white",
      border: "none",
      borderRadius: "10px",
      fontWeight: "bold",
      transform: "translate(-50%, -50%)",
      display: "none",
      zIndex: 20,
    });
    document.body.appendChild(el);
    return el;
  };

  const btnLook1 = makeBtn("Образ 1");
  const btnLook2 = makeBtn("Образ 2");

  btnLook1.addEventListener("click", async () => {
    await loadClothes("/static/models/jacket.glb");
    // можно обновить текст на панели (пересоздать или поменять CanvasTexture)
  });

  btnLook2.addEventListener("click", async () => {
    await loadClothes("/static/models/dress.glb");
  });

  // 3D точки, где будут висеть кнопки
  const look1Anchor = new THREE.Object3D();
  look1Anchor.position.set(-0.6, -0.6, 0.2);
  const look2Anchor = new THREE.Object3D();
  look2Anchor.position.set(0.6, -0.6, 0.2);
  anchor.group.add(look1Anchor);
  anchor.group.add(look2Anchor);

  const toScreen = (obj, camera, renderer) => {
    const v = new THREE.Vector3();
    obj.getWorldPosition(v);
    v.project(camera);
    const rect = renderer.domElement.getBoundingClientRect();
    return {
      x: (v.x + 1) / 2 * rect.width + rect.left,
      y: (-v.y + 1) / 2 * rect.height + rect.top,
      visible: v.z < 1,
    };
  };

  await loadMannequin();
  await mindarThree.start();
  document.getElementById("hint").style.display = "none";

  const updateBtn = () => {
    const p1 = toScreen(look1Anchor, camera, renderer);
    const p2 = toScreen(look2Anchor, camera, renderer);

    if (p1.visible) {
      btnLook1.style.display = "block";
      btnLook1.style.left = `${p1.x}px`;
      btnLook1.style.top = `${p1.y}px`;
    } else btnLook1.style.display = "none";

    if (p2.visible) {
      btnLook2.style.display = "block";
      btnLook2.style.left = `${p2.x}px`;
      btnLook2.style.top = `${p2.y}px`;
    } else btnLook2.style.display = "none";
  };

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    updateBtn();
  });

  window.addEventListener("resize", updateBtn);
  window.addEventListener("orientationchange", () =>
    setTimeout(updateBtn, 500)
  );
});
