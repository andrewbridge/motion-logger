initCompletion = ->
	completions = document.querySelectorAll(".completionText");
	for elm in completions
		input = elm.parentNode.querySelector("input")
		elm.setAttribute("data-tobecompleted", elm.textContent)
		elm.textContent = ""
		input.addEventListener("keyup", watchInput.bind(null, elm), false)

watchInput = (elm, e) ->
	if e.target instanceof HTMLInputElement
		input = e.target
		wholeText = elm.textContent+elm.getAttribute("data-tobecompleted")
		if (wholeText.substring(0, input.value.length) == input.value)
			elm.textContent = input.value
			elm.setAttribute("data-tobecompleted", wholeText.substring(input.value.length))

document.addEventListener("DOMContentLoaded", initCompletion, false)
