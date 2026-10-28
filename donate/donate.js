//=========================
// CONFIG
//=========================
const CONFIG = {
    bankId: "ICB",
    accountNo: "103875306342",
    accountName: "LUONG ANH SON",
    transferContent: "UNGHO MAPDULICH",
    template: "compact2",
    minAmount: 10000,
    maxAmount: 1000000
};

//=========================
// HELPERS
//=========================
function formatMoney(value){
    return Number(value).toLocaleString("vi-VN") + "đ";
}

function toast(text){
    const div = document.createElement("div");

    div.textContent = text;

    Object.assign(div.style,{
        position:"fixed",
        left:"50%",
        bottom:"30px",
        transform:"translateX(-50%)",
        background:"#333",
        color:"#fff",
        padding:"10px 18px",
        borderRadius:"8px",
        zIndex:"999999",
        fontSize:"14px"
    });

    document.body.appendChild(div);

    setTimeout(()=>{
        div.remove();
    },1800);
}

//=========================
// INIT
//=========================
function initDonate(){

    const modal = document.getElementById("donateModal");
    const openBtn = document.getElementById("openDonate");
    const closeBtn = document.getElementById("closeDonate");

    const amountInput = document.getElementById("amountInput");
    const createBtn = document.getElementById("createQR");

    const qrSection = document.getElementById("qrSection");
    const qrImage = document.getElementById("qrImage");
    const showMoney = document.getElementById("showMoney");

    const amountButtons =
        document.querySelectorAll(".amount-btn");

    const copyButtons =
        document.querySelectorAll(".copy-btn");

    const openLargeQR =
        document.getElementById("openLargeQR");

    const donateCard =
        document.querySelector(".donate-card");

    //=========================
    // Đẩy modal ra body
    //=========================
    if(modal && modal.parentNode !== document.body){
        document.body.appendChild(modal);
    }

    //=========================
    // LAYOUT
    //=========================
    function updateDonateLayout(){

        if(!donateCard) return;

        if(donateCard.offsetWidth <= 380){
            donateCard.classList.add("compact");
        }else{
            donateCard.classList.remove("compact");
        }
    }

    if(donateCard){

        updateDonateLayout();

        new ResizeObserver(updateDonateLayout)
            .observe(donateCard);

    }

    //=========================
    // VALIDATE
    //=========================
    function getAmount(){

        let amount =
            parseInt(amountInput?.value);

        if(isNaN(amount)){
            amount = CONFIG.minAmount;
        }

        if(amount < CONFIG.minAmount){
            alert("Số tiền tối thiểu là 10.000đ");
            return null;
        }

        if(amount > CONFIG.maxAmount){
            alert("Số tiền tối đa là 1.000.000đ");
            return null;
        }

        return amount;
    }

    //=========================
    // CREATE QR
    //=========================
    function createQR(){

        const amount = getAmount();

        if(amount === null) return;

        const url =
`https://img.vietqr.io/image/${CONFIG.bankId}-${CONFIG.accountNo}-${CONFIG.template}.png?amount=${amount}&addInfo=${encodeURIComponent(CONFIG.transferContent)}&accountName=${encodeURIComponent(CONFIG.accountName)}`;

        if(qrImage){
            qrImage.src = url;
        }

        if(showMoney){
            showMoney.innerHTML =
                formatMoney(amount);
        }

        if(qrSection){
            qrSection.style.display = "block";
        }
    }

    //=========================
    // OPEN / CLOSE
    //=========================
    openBtn?.addEventListener("click",()=>{
        modal.style.display="flex";
    });

    closeBtn?.addEventListener("click",()=>{
        modal.style.display="none";
    });

    window.addEventListener("click",(e)=>{
        if(e.target === modal){
            modal.style.display="none";
        }
    });

    window.addEventListener("keydown",(e)=>{
        if(e.key==="Escape"){
            modal.style.display="none";
        }
    });

    //=========================
    // AMOUNT BUTTONS
    //=========================
    amountButtons.forEach(btn=>{

        btn.addEventListener("click",()=>{

            amountButtons.forEach(b=>{
                b.classList.remove("active");
            });

            btn.classList.add("active");

            if(amountInput){
                amountInput.value =
                    btn.dataset.value;
            }

        });

    });

    //=========================
    // CREATE BUTTON
    //=========================
    createBtn?.addEventListener("click",
        createQR);

    amountInput?.addEventListener(
        "keydown",
        (e)=>{
            if(e.key==="Enter"){
                createQR();
            }
        }
    );

    amountInput?.addEventListener(
        "input",
        ()=>{
            amountButtons.forEach(btn=>{
                btn.classList.remove("active");
            });
        }
    );

    //=========================
    // COPY
    //=========================
    copyButtons.forEach(btn=>{

        btn.addEventListener("click",()=>{

            navigator.clipboard.writeText(
                btn.dataset.copy
            );

            toast("Đã sao chép");

        });

    });

    //=========================
    // OPEN LARGE QR
    //=========================
    openLargeQR?.addEventListener(
        "click",
        ()=>{

            if(!qrImage?.src) return;

            window.open(
                qrImage.src,
                "_blank"
            );

        }
    );

    //=========================
    // QR DEFAULT
    //=========================
    createQR();
}

//=========================
// AUTO INIT
//=========================
if(document.readyState === "loading"){

    document.addEventListener(
        "DOMContentLoaded",
        initDonate
    );

}else{

    initDonate();

}
