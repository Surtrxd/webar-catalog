import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/loaders/GLTFLoader.js";
import { MindARThree } from "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js";

document.addEventListener("DOMContentLoaded", () => {
  const catalogSection = document.getElementById("catalog-section");
  const arSection = document.getElementById("ar-section");
  const backBtn = document.getElementById("backToCatalog");
  const arStatus = document.getElementById("arStatus");
  const hintEl = document.getElementById("hint");

  // соответствие образов и файлов одежды
  const outfits = {
    look1: {
      name: "Образ 1: Жакет",
      file: "/static/models/jacket.glb",
    },
    look2: {
      name: "Образ 2: Повседневный",
      file: "/static/models/casual.glb",
    },
    look3: {
      name: "Образ 3: Вечерний",
      file: "/static/models/evening.glb",
    },
  };

  let currentOutfitId = null;
  let mindarThree = null;
  let started = false;

  let scene, camera, renderer, anchor;
  const loader = new GLTFLoader();

  let mannequin = null;
  let currentClothes = null;

  // ИНИЦИАЛИЗАЦИЯ MINDAR
  const initMindAR = async () => {
    if (mindarThree) return;

    mindarThree = new MindARThree({
      container: document.querySelector("#ar-container"),
      imageTargetSrc: "/static/ar/catalog-marker.mind", // твой .mind файл
    });

    const three = mindarThree;
    renderer = three.renderer;
    scene = three.scene;
    camera = three.camera;

    renderer.setClearColor(0x000000, 0);

    anchor = three.addAnchor(0);

    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.3);
    scene.add(light);

    await loadMannequin();

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });
  };

  const loadMannequin = () =>
    new Promise((resolve, reject) => {
      if (mannequin) {
        resolve();
        return;
      }
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
        (err) => reject(err)
      );
    });

  const loadClothes = (outfitId) =>
    new Promise((resolve, reject) => {
      const outfit = outfits[outfitId];
      if (!outfit) {
        console.warn("Нет такого образа:", outfitId);
        resolve();
        return;
      }

      // очищаем предыдущую одежду
      if (currentClothes && mannequin) {
        mannequin.remove(currentClothes);
        currentClothes.traverse((node) => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose());
            else node.material.dispose();
          }
        });
        currentClothes = null;
      }

      loader.load(
        outfit.file,
        (gltf) => {
          const clothes = gltf.scene;
          clothes.position.set(0, 0, 0); // при необходимости подогнать
          mannequin.add(clothes);
          currentClothes = clothes;
          arStatus.textContent = outfit.name;
          resolve();
        },
        undefined,
        (err) => reject(err)
      );
    });

  const startAR = async () => {
    await initMindAR();
    if (!started) {
      await mindarThree.start();
      started = true;
    }
    hintEl.style.display = "block";
    arStatus.textContent = "Наведите камеру на маркер";
  };

  // ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
  const openARWithOutfit = async (outfitId) => {
    currentOutfitId = outfitId;
    catalogSection.hidden = true;
    arSection.hidden = false;

    await startAR();
    if (currentOutfitId) {
      await loadClothes(currentOutfitId);
    }
  };

  const backToCatalog = () => {
    catalogSection.hidden = false;
    arSection.hidden = true;
    // AR можно не останавливать, чтобы быстро возвращаться
  };

  // КНОПКИ КАТАЛОГА
  document.querySelectorAll(".card").forEach((card) => {
    const outfitId = card.dataset.outfit;
    const btn = card.querySelector(".card-btn");
    const handler = () => openARWithOutfit(outfitId);

    card.addEventListener("click", handler);
    if (btn) btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handler();
    });
  });

  // КНОПКИ ВНУТРИ AR
  document.querySelectorAll(".ar-outfit-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const outfitId = btn.dataset.outfit;
      currentOutfitId = outfitId;
      await loadClothes(outfitId);
    });
  });

  backBtn.addEventListener("click", backToCatalog);

  // когда MindAR увидит маркер — можно спрятать подсказку
  document.addEventListener("markerFound", () => {
    hintEl.style.display = "none";
  });
});
