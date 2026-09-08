// Nav
const nav = document.querySelector("nav");
const navLi = document.querySelector("nav ul li");

document.getElementById("openNav").onclick = (e) => {
    e.stopPropagation();
    nav.classList.add("show");
};

document.addEventListener("click", (e) => {
    if (
        nav.classList.contains("show") &&
        !navLi.contains(e.target) &&
        e.target !== openNav
    ) {
        nav.classList.remove("show");
    }
});

document.querySelectorAll("nav li").forEach(li => {
    li.addEventListener("click", () => {
        location.href = li.dataset.href;
    });
});

// OrgaNav
async function checkOrga() {
    const navEdit = document.querySelectorAll(".navEdit");
    const { data: { user } } = await client.auth.getUser();

    const { data, error } = await client
        .from("profile")
        .select("orga")
        .eq("uid", user.id)
        .single();

    if (error) {
        console.error(error);
        alert(error.message);
        return;
    }

    if (data.orga) {
        navEdit.forEach(li => {
            li.style.display = "block";
        });

    } else {
        navEdit.forEach(li => {
            li.style.display = "none";
        });
    }
}

// Hilfe
const lightbox = document.getElementById("lightbox");
document.getElementById("openLightbox").onclick = () => {
    if (getComputedStyle(lightbox).display === "none") {
        lightbox.style.display = "block";
        document.querySelector("body").style.overflowY = "hidden";
    }
}

lightbox.onclick = (e) => {
    if (e.target === lightbox) {
        lightbox.style.display = "none";
        document.querySelector("body").style.overflowY = "auto";
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key === "Escape" || event.key === "Esc") {
        lightbox.style.display = "none";
        document.querySelector("body").style.overflowY = "auto";
    }
});   

document.getElementById("lightArrow").onclick = () => {
    document.getElementById("lightbox").scrollTo({
      top: document.getElementById("lightbox").scrollHeight,
      behavior: "smooth"
    });
}

// mobil
if (window.matchMedia("(max-width: 768px)").matches) {
    document.querySelector("main").style.display = "none";
    document.getElementById("mobile").style.display = "block";
}

document.getElementById("goYourWay").onclick = () => {
    document.querySelector("main").style.display = "block";
    document.getElementById("mobile").style.display = "none";
}
