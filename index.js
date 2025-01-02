let STATE = {
	mode : MODES.DISCLAIMER,
	deckList : null
}

function setState(stateFunction) {
	STATE = stateFunction(STATE);
	renderApplication(STATE);
}

function renderApplication(state) {
  
	if(state.mode === MODES.DISCLAIMER) {
		showDisclaimer();

		$(".accept-terms").click(function() {
			setState(oldState => {
				oldState.mode = MODES.EDIT;
				return oldState;
			});
		});
	} 

	else if(state.mode === MODES.EDIT) {

		$(".js-queryList").attr("placeholder-x", 
		`Exemple input:\n\n` + syntaxText);

		$(".js-queryList").placeholder();

		showEditScreen();

		$(".js-generate-button").click(function(event) {
			event.preventDefault();

			if (!$.trim($(".js-queryList").val())) {
				$(".js-queryList").val(sampleDecklist);
			}

			$(".js-results").empty();
			$(".js-results").append(`<div class="left-align"><p>To print this page use <b>Ctrl + P</b>.</p></div><br/>`);
			addProgressBar();

			//generate a list of query...
			let queryList = generateQueryList($(".js-queryList").val().split("\n"));
			console.log('queryList is: ', queryList)
			//set the loading counter for total queries
			const totalRequests = queryList.length;

			let completedRequests = 0;
			showReviewScreen();

			STATE.deckList = [];

			for(let i=0; i < queryList.length; i++) {
				const card = {}

				card.name = i;
				card.set = i;
				card.displayOrder = i;
				card.alternateImages = null;
				card.editMode = false;
				card.printsUri = queryList[i].query;
				card.layout = queryList[i].layout

				//update card images:
				card.cardImage = (queryList[i]) ? queryList[i].query : "";

				completedRequests++;
				let percentageComplete = (completedRequests / totalRequests) * 100;

				$(".progress-bar").css("width", `${percentageComplete}%`).attr("aria-valuenow", `${percentageComplete}`);

				card.needsRerender = true;

				if (card.cardImage !== "") {
					//push the cards into the deckList:
					for (let j = 0; j < queryList[i].quantity; j++) {
						const myTempCard = $.extend(true, {}, card);
						STATE.deckList.push(myTempCard);
					}
				} else {
					$(".js-results").prepend(`<div class="alert alert-danger alert-dismissible fade show col-12" role="alert">
					"${card.name}" could not be found. Try editing your list.
					<button type="button" class="close" data-dismiss="alert" aria-label="Close">
					<span aria-hidden="true">&times;</span>
					</button>
					</div>`);
				}
			}
			
			STATE.deckList = STATE.deckList.sort(function (card1, card2) {
				return card1.displayOrder - card2.displayOrder;
			});
			
			STATE.mode = MODES.REVIEW;
			editReviewButtons();
			renderApplication(STATE);
		});

		$(".js-clear-button").click(function() {
			$(".js-queryList").val("");
			$(".js-queryList").scrollTop();
		});

		$(".js-review-button").click(function() {
			STATE.mode = MODES.REVIEW;
			renderApplication(STATE);
		});

	} else if(state.mode === MODES.REVIEW) {

		showReviewScreen();

		$(".progress-container").remove();

		buildSpoiler(STATE.deckList);

	} else {
		throw new Error("Invalid Mode");
	}
}

////////////////////////////////////////////////////////
//  Utility Functions:
////////////////////////////////////////////////////////

function buildSpoiler(deckList) {
  
  for(let i = 0; i < deckList.length; i++) {
    
    const card = deckList[i];
    let cardDivs, cardDiv1, cardDiv2;
		
    // find existing cardDiv(s)
    cardDivs = $(`*[data-card="${card.name}-${i}"].card-div`);
    
    // if there are no matching cardDivs this is a new card, so let's create one
    if(cardDivs.length === 0) {
      
      // make 2 cardDivs for a 'normal' DFC
      if(card.cardImage2) {
        $(".js-results").append(`
        <div class="card-div col-6 col-sm-4 col-md-3 col-lg-2" data-card="${card.name}-${i}">
          <img class="normal">
        </div>

        <div class="card-div col-6 col-sm-4 col-md-3 col-lg-2" data-card="${card.name}-${i}">
          <img>
        </div>`);
        // else make a single cardDiv
      } else {
        $(".js-results").append(`
        <div class="card-div col-6 col-sm-4 col-md-3 col-lg-2" data-card="${card.name}-${i}">
          <img>
        </div>`);
      }
      //now there is at least one cardDiv, so lets save them
      cardDivs = $(`*[data-card="${card.name}-${i}"].card-div`);
    }
    
    cardDiv1 = $(cardDivs[0])

    if(cardDivs.length > 1) {
      cardDiv2 = $(cardDivs[1])
    }
    
    if(card.needsRerender) {

      // add normal card face images
      if(card.layout === 'normal') {
        cardDiv1.find('img').replaceWith(`<img class="normal" src="${card.cardImage}" alt="${card.name}">`)
        if(card.cardImage2) {
          cardDiv2.find('img').replaceWith(`<img class="normal" src="${card.cardImage2}" alt="${card.name}">`);
        }
      }
      
      deckList[i].needsRerender = false;
    }
  }
}

function generateQueryList(userInputArr) {
  
  const queryList = [];
  
  for(let i = 0; i < userInputArr.length; i++) {
    const query = {};
    let currentItem = userInputArr[i]
    //check quantity and store in query object:
    query.quantity = checkQuantity(currentItem)
    //remove quantity from currentItem
    currentItem = currentItem.replace(/^([0-9]+)/g, '').trim();
    //check for flags:

    query.layout = 'normal'
    query.queryEndpoint = 'named'
	
    query.query = currentItem.trim();
    console.log(`query #${i} before being pushed is: `, query)
    queryList.push(query);
    console.log(`queryList #${i} is: `, queryList[i])
  }
  
  for(let i = 0; i < queryList.length; i++) {
    
    const currentCard = queryList[i];
    
    for(let j = i+1; j < queryList.length; j++) {
      
      let nextCard = queryList[j];
      
      while((j < queryList.length) && (currentCard.query === nextCard.query) && (currentCard.layout === nextCard.layout)) {
        currentCard.quantity += nextCard.quantity;
        queryList.splice(j, 1);
        nextCard = queryList[j];
      }
    }
  }
  
  return queryList;
}

function checkQuantity(userQuery) {
  userQuery = parseInt(userQuery);
  if(isNaN(userQuery)) {
    return 1;
  } else {
    return userQuery;
  }
}

function showDisclaimer() {
  $(".disclaimer").prop('hidden', false);
  $(".js-input-section").prop('hidden', true);
  $(".js-results").prop('hidden', true);
  $("footer").prop('hidden', false);
}

function showEditScreen() {
  $(".disclaimer").prop('hidden', true);
  $(".js-input-section").prop('hidden', false);
  $(".js-results").prop('hidden', true);
  $("footer").prop('hidden', true);
}

function showReviewScreen() {
  $(".disclaimer").prop('hidden', true);
  $(".js-input-section").prop('hidden', true);
  $(".js-results").prop('hidden', false);
  $("footer").prop('hidden', true);
}

function editReviewButtons() {
  $(".edit-review").html(`
    <div class="btn-group btn-group-toggle" data-toggle="buttons" role="radiogroup" aria-label="navigate">
      <label class="btn btn-warning js-edit-button">
        <input type="radio" name="options" id="option1" autocomplete="off" aria-label="edit" checked> Edit
      </label>
      <label class="btn btn-info active js-review-button">
        <input type="radio" name="options" id="option3" autocomplete="off" aria-label="review" checked> Review
      </label>
    </div>
  `);
  
  $(".js-edit-button").click(function() {
    $().addClass("focus");
    $(".js-review-button").removeClass("focus");
    showEditScreen();
  });
  
  $(".js-review-button").click(function() {
    $().addClass("focus");
    $(".js-edit-button").removeClass("focus");
    showReviewScreen();
  });
}

function addProgressBar() {
  $(".js-results").append(`
    <div class="progress-container w-100 p-0">
      <div class="progress">
        <div class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    </div>
  `);
}

$(function() {
  renderApplication(STATE);
});
