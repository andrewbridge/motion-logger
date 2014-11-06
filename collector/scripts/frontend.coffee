init = ->
	completions = document.querySelectorAll(".completionText");
	for elm in completions
		input = elm.parentNode.querySelector("input")
		elm.setAttribute("data-tobecompleted", elm.textContent)
		elm.textContent = ""
		input.addEventListener("keyup", watchInput.bind(null, elm), false)
	button.addEventListener("click", changeSlide.bind(window, "next"), false) for button in document.querySelectorAll("[data-action=\"next\"]")
	button.addEventListener("click", changeSlide.bind(window, "prev"), false) for button in document.querySelectorAll("[data-action=\"prev\"]")

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
			current.removeAttribute("data-active")
			current.nextSibling.setAttribute("data-active", "true")
		else if (direction is "prev" or direction is "up") and current.previousSibling
			current.removeAttribute("data-active")
			current.previousSibling.setAttribute("data-active", "true")
		true
	false

document.addEventListener("DOMContentLoaded", init, false)
