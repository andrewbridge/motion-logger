initFrontend = ->
	completions = document.querySelectorAll(".completionText");
	for elm in completions
		input = elm.parentNode.querySelector("input")
		elm.setAttribute("data-tobecompleted", elm.textContent)
		elm.textContent = ""
		input.addEventListener("keyup", watchInput.bind(null, elm), false)
	button.addEventListener("click", changeSlide.bind(window, "next"), false) for button in document.querySelectorAll("[data-action*=\"next\"]")
	button.addEventListener("click", changeSlide.bind(window, "prev"), false) for button in document.querySelectorAll("[data-action*=\"prev\"]")
	select.addEventListener("change", smartSelect, false) for select in document.querySelectorAll("select")
	if window.motionTracking?
		button.addEventListener("click", window.motionTracking.dataupldr.start.bind(window.motionTracking.dataupldr), false) for button in document.querySelectorAll("[data-action*=\"start\"]")
		button.addEventListener("click", apocalypseNow.bind(window), false) for button in document.querySelectorAll("[data-action*=\"stop\"]")
	ctrl.setAttribute("disabled", "disabled") for ctrl in document.querySelectorAll(".screen:not([data-active]) button, .screen:not([data-active]) input, .screen:not([data-active]) select")
	chatBox.addEventListener("enterpress", addReply, false) for chatBox in document.querySelectorAll(".conversation .chatbox")

	changeTitle(document.querySelector(".screen[data-active]"))
	window.scrollTo 0,1

watchInput = (elm, e) ->
	if e.target instanceof HTMLInputElement
		input = e.target
		wholeText = elm.textContent+elm.getAttribute("data-tobecompleted")
		if (wholeText.substring(0, input.value.length) == input.value)
			elm.textContent = input.value
			elm.setAttribute("data-tobecompleted", wholeText.substring(input.value.length))

changeSlide = (direction) ->
	current = document.querySelector(".screen[data-active]")
	if current
		if (direction is "next" or direction is "down") and current.nextSibling
			newSlide = current.nextSibling
		else if (direction is "prev" or direction is "up") and current.previousSibling
			newSlide = current.previousSibling
		if newSlide?
			current.removeAttribute("data-active")
			ctrl.setAttribute("disabled", "disabled") for ctrl in current.querySelectorAll("button, input, select")
			newSlide.setAttribute("data-active", "true")
			ctrl.removeAttribute("disabled") for ctrl in newSlide.querySelectorAll("button, input, select")
			changeTitle(newSlide)
		true
	false

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
	eventTarget = e.target
	parent = eventTarget.parentNode
	reply = eventTarget.value
	replySpace = parent.querySelector(".tester:not(.show)")
	eventTarget.value = ""
	replySpace.textContent = reply
	replySpace.className += " show"
	nextResponse = parent.querySelector(".robot:not(.show)")
	if nextResponse?
		showNext = -> nextResponse.className += " show"
		setTimeout(showNext, 1000)
	if not parent.querySelector(".tester:not(.show)")?
		eventTarget.setAttribute("disabled", "disabled")
		eventTarget.removeAttribute("placeholder")
	true


document.addEventListener("DOMContentLoaded", initFrontend, false)
