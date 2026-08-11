const nav = document.querySelector("nav");
document.getElementById("openNav").onclick = (e) => {
    e.stopPropagation();
    nav.classList.add("show");
};

const navLi = document.querySelector("nav ul li");

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
