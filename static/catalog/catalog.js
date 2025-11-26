// правильный импорт three.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/loaders/GLTFLoader.js";

// Берём MindARThree из глобального объекта
const { MindARThree } = window.MINDAR.IMAGE;

document.addEventListener("DOMContentLoaded", () => {
  const catalogSection = document.getElementById("catalog-section");
  const arSection = document.getElementById("ar-section");
  const backBtn = document.getElementById("backToCatalog");
  const arStatus = document.getElementById("arStatus");
  const hintEl = document.getElementById("hint");

  // одежда, которую можно выбирать
  const outfits = {
    look1: {
      name: "Образ 1: Жакет",
      file: "/static/models/cyberpunk_2077_-_vs_jacket.glb",
    },
    look2: {
      name: "Образ 2: Платье",
      file: "/static/models/woman_dress.glb",
    },
  };

  let currentOutfitId = null;

  let mindarThree = null;
  let started = false;

  let scene, camera, renderer, anchor;
  const loader = new GLTFLoader();

  let mannequin = null;
  let currentClothes = null;

  // ИНИЦИАЛИЗАЦИЯ AR
  const initMindAR = async () => {
    if (mindarThree) return;

    console.log("Инициализация MindAR...");

    mindarThree = new MindARThree({
      container: document.querySelector("#ar-container"),
      imageTargetSrc: "/static/catalog/catalog-marker.mind", // <-- путь к твоему .mind файлу
    });

    const three = mindarThree;
    renderer = three.renderer;
    scene = three.scene;
    camera = three.camera;

    anchor = three.addAnchor(0);

    renderer.setClearColor(0x000000, 0);

    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.3);
    scene.add(light);

    // события маркера
    anchor.onTargetFound = () => {
      console.log("Маркер найден");
      hintEl.style.display = "none";
      arStatus.textContent = "Маркер найден";
    };

    anchor.onTargetLost = () => {
      console.log("Маркер потерян");
      hintEl.style.display = "block";
      arStatus.textContent = "Наведите камеру на маркер";
    };

    await loadMannequin();

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });
  };

  // ЗАГРУЗКА МАНЕКЕНА
  const loadMannequin = () =>
    new Promise((resolve, reject) => {
      if (mannequin) return resolve();

      console.log("Загрузка манекена...");

      loader.load(
        "/static/models/mannequin.glb",
        (gltf) => {
          mannequin = gltf.scene;
          mannequin.scale.set(0.5, 0.5, 0.5);
          mannequin.position.set(0, -0.2, 0);
          anchor.group.add(mannequin);

          console.log("Манекен загружен");
          resolve();
        },
        undefined,
        (err) => {
          console.error("Ошибка загрузки манекена:", err);
          reject(err);
        }
      );
    });

  // ЗАГРУЗКА ОДЕЖДЫ
  const loadClothes = (outfitId) =>
    new Promise((resolve, reject) => {
      const outfit = outfits[outfitId];
      if (!outfit) return resolve();

      console.log("Загрузка одежды:", outfitId);

      if (currentClothes) {
        mannequin.remove(currentClothes);
        currentClothes = null;
      }

      loader.load(
        outfit.file,
        (gltf) => {
          const clothes = gltf.scene;
          clothes.position.set(0, 0, 0);
          mannequin.add(clothes);
          currentClothes = clothes;

          arStatus.textContent = outfit.name;
          console.log("Одежда загружена:", outfit.name);

          resolve();
        },
        undefined,
        (err) => {
          console.error("Ошибка загрузки одежды:", err);
          reject(err);
        }
      );
    });

  // СТАРТ КАМЕРЫ
  const startAR = async () => {
    await initMindAR();

    if (!started) {
      console.log("Запуск камеры через mindarThree.start()");
      await mindarThree.start(); // тут браузер должен спросить доступ к камере
      started = true;
    }

    hintEl.style.display = "block";
    arStatus.textContent = "Наведите камеру на маркер";
  };

  // ПЕРЕХОД К AR
  const openARWithOutfit = async (outfitId) => {
    currentOutfitId = outfitId;

    catalogSection.hidden = true;
    arSection.hidden = false;

    await startAR();
    await loadClothes(outfitId);
  };

  // ВОЗВРАТ К КАТАЛОГУ
  const backToCatalog = () => {
    catalogSection.hidden = false;
    arSection.hidden = true;
  };

  backBtn.addEventListener("click", backToCatalog);

  // КЛИКИ ПО КАРТОЧКАМ
  document.querySelectorAll(".card").forEach((card) => {
    const outfitId = card.dataset.outfit;
    const btn = card.querySelector(".card-btn");

    const handler = () => openARWithOutfit(outfitId);

    card.addEventListener("click", handler);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handler();
    });
  });

  // СМЕНА ОБРАЗОВ В AR
  document.querySelectorAll(".ar-outfit-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const outfitId = btn.dataset.outfit;
      await loadClothes(outfitId);
    });
  });

  console.log("catalog.js загружен");
});
