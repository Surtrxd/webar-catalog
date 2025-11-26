// src/ar.js
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MindARThree } from "mindar-image-three";

document.addEventListener("DOMContentLoaded", async () => {
  const catalogSection = document.querySelector("#catalog-section");
  const arSection = document.querySelector("#ar-section");
  const backBtn = document.querySelector("#backToCatalog");
  const arStatus = document.querySelector("#arStatus");
  const hint = document.querySelector("#hint");
  const container = document.querySelector("#container");

  const setHint = (text) => {
    if (hint) hint.textContent = text;
    console.log("[HINT]", text);
  };

  // соответствие образов и моделей
  const outfits = {
    look1: {
      name: "Образ 1: Жакет",
      file: "./assets/cyberpunk_2077_-_vs_jacket.glb",
    },
    look2: {
      name: "Образ 2: Платье",
      file: "./assets/woman_dress.glb",
    },
  };

  let currentOutfitId = null;

  let mindarThree = null;
  let started = false;

  let renderer, scene, camera, anchor;
  const loader = new GLTFLoader();

  let mannequin = null;
  let currentClothes = null;

  // инициализация MindAR (один раз)
  const initMindAR = async () => {
    if (mindarThree) return;

    mindarThree = new MindARThree({
      container,
      imageTargetSrc: "./assets/catalog-marker.mind", // твой .mind файл
    });

    ({ renderer, scene, camera } = mindarThree);

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.8);
    scene.add(hemi);

    anchor = mindarThree.addAnchor(0);

    // обработка событий маркера
    anchor.onTargetFound = () => {
      console.log("TARGET FOUND");
      setHint("Маркер найден. Манекен загружен.");
    };

    anchor.onTargetLost = () => {
      console.log("TARGET LOST");
      setHint("Маркер потерян. Наведи камеру на картинку ещё раз.");
    };

    await loadMannequin();

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });

    window.addEventListener("resize", () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
  };

  const loadMannequin = () =>
    new Promise((resolve, reject) => {
      if (mannequin) return resolve();

      console.log("Загружаю манекен...");
      loader.load(
        "./assets/mannequin.glb",
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
          console.error("Ошибка загрузки mannequin.glb:", err);
          setHint("Не удалось загрузить манекен (см. консоль).");
          reject(err);
        }
      );
    });

  const loadClothes = (outfitId) =>
    new Promise((resolve, reject) => {
      const outfit = outfits[outfitId];
      if (!outfit || !mannequin) {
        console.warn("Нет такого образа или манекен не загружен:", outfitId);
        return resolve();
      }

      // удалить предыдущую одежду
      if (currentClothes) {
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

      console.log("Загружаю одежду:", outfit.file);

      loader.load(
        outfit.file,
        (gltf) => {
          const clothes = gltf.scene;
          clothes.position.set(0, 0, 0);
          mannequin.add(clothes);
          currentClothes = clothes;
          arStatus.textContent = outfit.name;
          setHint("Наведи камеру на маркер.");
          resolve();
        },
        undefined,
        (err) => {
          console.error("Ошибка загрузки одежды:", err);
          setHint("Не удалось загрузить одежду (см. консоль).");
          reject(err);
        }
      );
    });

  const startAR = async () => {
    await initMindAR();
    if (!started) {
      console.log("Запускаю MindAR...");
      await mindarThree.start(); // здесь браузер спрашивает доступ к камере
      started = true;
      setHint("Камера запущена. Наведи на маркер.");
    }
  };

  const openARWithOutfit = async (outfitId) => {
    currentOutfitId = outfitId;

    catalogSection.hidden = true;
    arSection.hidden = false;

    await startAR();
    await loadClothes(outfitId);
  };

  const backToCatalog = () => {
    catalogSection.hidden = false;
    arSection.hidden = true;
    setHint("Выберите образ в каталоге.");
  };

  backBtn.addEventListener("click", backToCatalog);

  // обработка нажатий по карточкам каталога
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

  // кнопки смены образов уже в AR
  document.querySelectorAll(".ar-outfit-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const outfitId = btn.dataset.outfit;
      await loadClothes(outfitId);
    });
  });

  setHint("Выберите образ в каталоге.");
});
