const eventApp = {};

eventApp.rootUrl = "https://app.ticketmaster.com/discovery/v2/events?";
eventApp.apikey = "EeUJwgupK3UyzCjN3Gpm8bYmgMd8Z5nH";

eventApp.init = function(){
    
    eventApp.getUserInput();
    eventApp.seatMapEventListener();
};


// function to get the data from the API using user selected city, category and date
eventApp.getEvents = function(city,category,startDate,endDate){
    const url = new URL(eventApp.rootUrl);
    url.search = new URLSearchParams({
        apikey: eventApp.apikey,
        city: city, //will get from user - drop down
        classificationName: category, //will get from user - drop down
        startDateTime: startDate,  
        endDateTime: endDate,
        sort: "date,asc",
    });

    fetch(url).then(response=>response.json())
    .then(jsonResponse => {
        eventApp.displayEvents(jsonResponse["_embedded"]["events"]);
    })
    .catch(()=>{
        alert("Sorry, no events found :(");
    });
}

// added createEventInfo function to minimize code in displayEvents function
eventApp.createEventInfo = function(eventListing){
    const eventInfo = document.createElement("div");
        eventInfo.classList.add("eventInfo");

        // some listings are missing properties (e.g. price, description),
        // added try-catch blocks to catch these errors and display an alternative

        const name = document.createElement("h2");
        try {
            name.innerText = eventListing.name;
        } catch {
            name.innerText = "";
        }

        const venue = document.createElement("p");
        try {
            venue.innerText = `Venue: ${eventListing._embedded.venues[0].name}`;
        } catch {
            venue.innerText = `Venue: TBD`;
        }

        const date = document.createElement("p");
        try {
            date.innerText = `Date: ${eventListing.dates.start.localDate}`;
        } catch {
            date.innerText = `Date: TBD`;
        }

        //API returns military time, code block created to display time in a user friendly format
        const time = document.createElement("p");
        try {

            const timeText = (eventListing.dates.start.localTime).split(":")

            let timeHours = timeText[0]
            let timeMinutes = timeText[1]
            let timeOfDay = "AM"

            if (timeHours >= 12) {
                timeOfDay = "PM"
                if (timeHours > 12) {
                    timeHours -= 12
                }
            }

            time.innerText = `Time: ${timeHours}:${timeMinutes} ${timeOfDay}`;
        } catch {
            time.innerText = `Time: TBD`;
        }

        const price = document.createElement("p");
        try{
            price.innerText = `Price Range: $${Math.round(eventListing.priceRanges[0].min)} - $${Math.round(eventListing.priceRanges[0].max)}`; //rounded pricing to nearest dollar
        } catch{
            price.innerText=`Price: TBD`;
        }

        const description = document.createElement("p");
        try {
            const fullDescription = eventListing.description;
            const parsedDescription = fullDescription.split(/\r?\n/);
            description.innerText = parsedDescription[0];
        } catch {
            description.innerText = ``;
        }

        eventInfo.append(name, venue,date,time,price,description);

        

        return eventInfo;
}

eventApp.createPopUpDiv = function(popupImageSrc, popupImageAlt){

    const popUpDiv = document.createElement("div");
    popUpDiv.classList.add("popupBackground");
    popUpDiv.innerHTML = `
            <div class="popupContainer">
                <div class="popup wrapper">
                    <div class="button-container">
                        <button id="closePopupButton"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="popupImg">
                        <img src=${popupImageSrc} alt=${popupImageAlt}>
                    </div>
                </div><!--.popup .wrapper end-->
            </div> <!--.popupContainer end-->
    `;
    return popUpDiv;
}

eventApp.displayEvents = function(events) {

    document.querySelector(".resultsContainer").innerHTML = "";

    events.forEach(eventListing => {
        const listItem = document.createElement("li");
        listItem.classList.add("resultsListItem");       

        const eventImage = document.createElement("div");
        eventImage.classList.add("eventImage");

        const image = document.createElement("img");
        image.src = eventListing.images[0].url;
        image.alt = eventListing.name;

        
        eventImage.appendChild(image);
        const eventInfoDiv = eventApp.createEventInfo(eventListing);


        listItem.appendChild(eventImage);
        // listItem.appendChild(eventInfoDiv);

        let seatMapDiv;
        try{
            const seatMapUrl = eventListing.seatmap.staticUrl;
            const seatMapAlt = "Seat map:" + eventListing.name;

            //if seat map exists
            //1) add Seat Map button to events info div and add event info div to list item
            const seatMapButtonDiv = document.createElement("div");
            seatMapButtonDiv.innerHTML = `<button class="button seatMap">Seat Map</button>`;
            eventInfoDiv.appendChild(seatMapButtonDiv);
            listItem.appendChild(eventInfoDiv);

            //2) create seat map pop up div and add it to list item
            seatMapDiv = this.createPopUpDiv(seatMapUrl, seatMapAlt);
            listItem.appendChild(seatMapDiv);
        } catch {
            //if seat map doesn't exist, add event info div to list item without seat map button or pop up
            listItem.appendChild(eventInfoDiv);
        }

        document.querySelector(".resultsContainer").appendChild(listItem);
    });

    eventApp.seatMapEventListener();
}


//function to retrieve user selections upon form submission, and retrieve events from API
eventApp.getUserInput = function(){
    const form = document.querySelector("form");
    form.addEventListener("submit", function(event){
        event.preventDefault();
        const selectedCity = document.querySelector("select[name=cityName]").value;
        let selectedCategory = document.querySelector(
        "select[name=categoryName]").value;
        const startDate = document.querySelector("input[name=startDate]").value + "T06:00:00Z";
        let endDate =document.querySelector("input[name=endDate]").value + "T23:59:00Z";
        
        if (selectedCategory === "All") {
            selectedCategory = ""
        } //Added all filter to display all available events 

        //if user selects invalid end date, change end date to start date (will only search for events on selected start date)
        if (endDate<startDate){
            document.querySelector("input[name=endDate]").value = document.querySelector("input[name=startDate]").value;
            endDate = document.querySelector("input[name=endDate]").value + "T23:59:00Z";
        }

        eventApp.getEvents(selectedCity, selectedCategory,startDate,endDate);
    });
};

eventApp.seatMapEventListener = function(){
    const seatMapButtons = document.querySelectorAll(".seatMap");
    
    //if show seat map button pushed, then display popup on screen
    seatMapButtons.forEach(button => button.addEventListener("click", (event) => {
        const popupOverlay = event.target.parentNode.parentNode.nextElementSibling;
        popupOverlay.classList.add("showPopup");
    }));

    //close pop up if
    // a) X button on pop up clicked or
    // b) user clicks outside of the pop up image

    const closePopupButtons = document.querySelectorAll("#closePopupButton");
    closePopupButtons.forEach(button=> button.addEventListener("click", (event) => {
        const popupOverlay = event.target.closest(".popupBackground");
        popupOverlay.classList.remove("showPopup");
    }));

    const popupContainer = document.querySelectorAll(".popupContainer");
    popupContainer.forEach(container => container.addEventListener("click", (event)=>{
        const popupOverlay = event.target.closest(".popupBackground");
        if (event.target === container) {
            popupOverlay.classList.remove("showPopup");
        }
    }));
};

eventApp.init();