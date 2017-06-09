/*jshint esversion: 6 */
export function error(e) {
	var err = { code: -1, http: null }
	if (e.status !== undefined) {
		err.code = e.status
		err.error = e.statusText
		err.data = e.data ? e.data.errors : null
		err.http = e
		err.message = formatMessage(err)
	} else if (typeof e == "string") {
		err.message = err.error = e
	} else {
		err.message = e.error = e.message
	}
	console.error("[VueIdentity Error]", err)
	return err
}

export function parseToken(token) {
  var base64Url = token.split('.')[1]
  var base64 = base64Url.replace('-', '+').replace('_', '/')
  return JSON.parse(window.atob(base64))
}

function formatMessage(e) {
	// Custom
	if (e.error == 'Connection Issue') return 'Could not connect'
	if (e.error == 'Bad Request') return 'Invalid data'
	if (e.error == 'Token Expired') return 'Token Expired'
	// Standard http
	if (e.code == 500) return 'Server Error'
	if (e.code == 404) return 'Not Found'
	if (e.code == 403) return 'Forbidden'
	if (e.code == 401) return 'Unauthorized'
	return 'Unknown error'
}
