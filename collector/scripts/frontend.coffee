initFrontend = ->
	completions = document.querySelectorAll(".completionText");
	for elm in completions
		input = elm.parentNode.querySelector("input")
		elm.setAttribute("data-tobecompleted", elm.textContent)
		elm.textContent = ""
		input.addEventListener("keyup", watchInput.bind(null, elm), false)
	button.addEventListener("click", changeSlide.bind(window, "next", progressionRequirements), false) for button in document.querySelectorAll("[data-action*=\"next\"]")
	button.addEventListener("click", changeSlide.bind(window, "prev", progressionRequirements), false) for button in document.querySelectorAll("[data-action*=\"prev\"]")
	document.querySelector("nav [data-action*=\"next\"]").addEventListener("click", checkForEnd.bind(window), false)
	button.addEventListener("click", addReply.bind(window), false) for button in document.querySelectorAll(".conversation button")
	select.addEventListener("change", smartSelect, false) for select in document.querySelectorAll("select")
	if window.motionTracking?
		button.addEventListener("click", window.motionTracking.dataupldr.start.bind(window.motionTracking.dataupldr), false) for button in document.querySelectorAll("[data-action*=\"start\"]")
		button.addEventListener("click", apocalypseNow.bind(window), false) for button in document.querySelectorAll("[data-action*=\"stop\"]")
	ctrl.setAttribute("disabled", "disabled") for ctrl in document.querySelectorAll(".screen:not([data-active]) button, .screen:not([data-active]) input, .screen:not([data-active]) select")
	chatBox.addEventListener("enterpress", addReply, false) for chatBox in document.querySelectorAll(".conversation .chatbox")

	changeTitle(document.querySelector(".screen[data-active]"))
	window.scrollTo 0,1

progressionRequirements = [
	(elm) ->
		true
,
	(elm) ->
		true
,
	(elm) ->
		true
,
	(elm) ->
		elm.querySelector("p.completionText").getAttribute("data-tobecompleted").length is 0
,
	(elm) ->
		elm.querySelector(".conversation p:not(.show):not(.seen)") is null
,
	(elm) ->
		elm.querySelector("input").value.indexOf("Robot") isnt -1
,
	(elm) ->
		false
]

watchInput = (elm, e) ->
	if e.target instanceof HTMLInputElement
		input = e.target
		wholeText = elm.textContent+elm.getAttribute("data-tobecompleted")
		if (wholeText.substring(0, input.value.length) == input.value)
			elm.textContent = input.value
			elm.setAttribute("data-tobecompleted", wholeText.substring(input.value.length))

getNextSlide = (direction, current = document.querySelector(".screen[data-active]")) ->
	if (direction is "next" or direction is "down") and current.nextSibling
		newSlide = current.nextSibling
	else if (direction is "prev" or direction is "up") and current.previousSibling
		newSlide = current.previousSibling
	newSlide

changeSlide = (direction, requirementsArr, e) ->
	ret = false
	current = document.querySelector(".screen[data-active]")
	if current
		newSlide = getNextSlide(direction, current)
		if newSlide? and ((requirementsArr? and requirementsArr[elmIndex(current)](current)) or not requirementsArr?)
			current.removeAttribute("data-active")
			ctrl.setAttribute("disabled", "disabled") for ctrl in current.querySelectorAll("button, input, select")
			newSlide.setAttribute("data-active", "true")
			ctrl.removeAttribute("disabled") for ctrl in newSlide.querySelectorAll("button, input, select")
			changeTitle(newSlide)
			ret = true
		else if requirementsArr? and not requirementsArr[elmIndex(current)](current)
			current.querySelector(".errorEm").setAttribute("data-error", "true")
	if e?
		checkForNext(direction, e)
	ret

checkForNext = (direction, e) ->
	newSlide = getNextSlide(direction)
	e.target.removeAttribute("data-disabled")
	if not newSlide?
		e.target.setAttribute("data-disabled", "disabled")
	true

checkForEnd = (e) ->
	if e.target.getAttribute("data-action").indexOf("stop") isnt -1
		streamEntry = {event: "formdata", formData: {}}
		for formDataElm in document.querySelectorAll(".formData")
			streamEntry.formData[formDataElm.name] = if (formDataElm.tagName is "SELECT") then formDataElm.selectedIndex else formDataElm.value
		window.motionTracking.stream.add streamEntry
		apocalypseNow()
		window.close()
		for prompt in document.querySelectorAll(".endPrompt")
			prompt.style.display = "block"
	else if e.target.getAttribute("data-disabled") is "disabled"
		e.target.setAttribute("data-action", e.target.getAttribute("data-action")+" stop")

changeTitle = (screen) ->
	headline = screen.getAttribute("data-headline")
	if headline?
		document.title = "Motion Logger > "+headline
	else
		document.title = "Motion Logger"
	true

smartSelect = (e) ->
	eventTarget = e.target
	selectedOption = eventTarget.querySelector("option:nth-child("+(eventTarget.selectedIndex+1)+")")
	otherField = document.querySelector("input.other-field[type='text'][data-for='"+(eventTarget.id||eventTarget.name)+"']")
	console.log e, eventTarget, selectedOption, otherField
	if e.type is "change"
		if selectedOption.value.toLowerCase() is "other"
			if otherField?
				otherField.className += " show"
		else
			if otherField?
				otherField.className = otherField.className.replace /( show | show|show |show)/g, ""

addReply = (e) ->
	eventTarget = if (e.target.tagName == "BUTTON") then e.target.previousSibling else e.target
	parent = eventTarget.parentNode
	reply = eventTarget.value
	if reply.length > 0
		replySpace = parent.querySelector(".tester:not(.show):not(.seen)")
		eventTarget.value = ""
		replySpace.textContent = reply
		replySpace.className += " show"
		parent.scrollTop = parent.scrollHeight
		nextResponse = parent.querySelector(".robot:not(.show):not(.seen)")
		if nextResponse?
			showNext = ->
				nextResponse.className += " show"
				parent.scrollTop = parent.scrollHeight
				while parent.querySelectorAll(".show").length > 2
					showing = parent.querySelector(".show")
					showing.className = showing.className.replace /( show | show|show |show)/g, ""
					showing.className += " seen"
				true
			setTimeout(showNext, 1000)
		if not parent.querySelector(".tester:not(.show):not(.seen)")?
			eventTarget.setAttribute("disabled", "disabled")
			eventTarget.nextSibling.setAttribute("disabled", "disabled")
			setTimeout(->
				eventTarget.setAttribute("placeholder", "Robot is offline, continue to the next task.")
			, 1000)
		true
	false

elmIndex = (child) ->
	i = 0
	while( (child = child.previousSibling) != null )
		i++;
	i


document.addEventListener("DOMContentLoaded", initFrontend, false)
