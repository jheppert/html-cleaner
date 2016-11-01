/** The goal of this helper function is to clean (sanitize) any HTML formatted text and make it safe for output in a javascript-enabled web browser. The basic concept is to remove anything that is not explicitly allowed (as opposed to specify what is not allowed). 

@author Martin Östlund [martin.ostlund@instantconnect.se]
@last edit: 20130325 by Martin Östlund
@license GPL
	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var Cleaner = new function() {

	/** Sanitizes html code by keeping only that content that is enclosed in allowed tags. It also removes any attributes/attribute-value-pairs that are not explicitly specified. What tags and attributes are allowed are specified by adding an arbitrary number of pairs (0-N) of allowedTag and allowedAttributeList. The final two parameters (allowJavascriptPrefix and allowQuerystring) follow the arbitrary number of allowedTag/allowedAttributeList-pairs.
	@param content The html text to be sanitized
	@param allowedTag The name of the tag that is allowed (without enclosing characters ex: "div" - NOT:"<div>")
	@param allowedAttributeList An array containing the allowed attributes. Any attributes not in this list will be expunged from the tag
	@param allowJavascriptPrefix Whether to allow a javascript in attribute-values, example: http="javascript:alert('...');". This is a global setting that affects all attributes for all (allowed) tags.
	@param allowQuerystring Whether to allow querystrings in attributes. If not allowed the querystring portion is removed from the attribute value. This effectively disallows the use of the '?' sign since this is used to identify a querystring. Therefore other uses of the '?' character need to be escaped. 
	@return Returns the sanitized html code, now containing only explicity allowed tags and attributes.
	*/
	this.sanitize = function(content, allowedTag, allowedAttributeList, allowJavascriptPrefix, allowQuerystring) {
		var c, 			// The character at the current position
			i = 0, 		// Counter that keeps track of the current position in the text string
			r = "",		// Holds the content that has been checked so far
			contentLength = content.length,	// The length of the content string
			temp = "", 	// Used to temporarily hold the contents of the currently parsed tag
			tag = "",	// Holds the name of the current tag
			tempTag = "",	// Holds the characters of the current tag name until all characters have been read
			inSingleQuotes,	// Used to keep track of string within single quotes
			inDoubleQuotes,	// Used to keep track of string within double quotes
			allowedList = [],	// Holds the list of allowed tags and their respective allowed attributes in what will be built into a two-dimensional array 
			noClosing = false,	// Identifies tags with no closing tags, i.e. selfclosing tags such as <img /> and <br />
			tagCount,	// Keeps track of number of opening tags that have been encountered when expunging tags and their content
			searchTag,	// Stores the current tag name while searching for content to skip when expunging tags and their content
			_allowedTag, _allowedAttributeList;	// Used as temporary values when build the allowed list from allowedTag/allowedAttributeList-pairs.
			
			
		/* Take care of the arguments. Builds a two-dimensional associative array with tag-names as key at the top level and attribute-names at the second level.
			It does this by using the arguments-object and extracting the arguments from this, skipping the first argument (which contains the content to be sanitized) and then looking for pairs of allowedTag and allowedAttributeList until it encounters an argument that is of boolean type indicating that it has reached the last pair of variables: allowJavascriptPrefix and allowQuerystring (or reached the end of the argument list if these two optional arguments are not used.)*/	
		for(var k=1, kl = arguments.length; k+1<kl; k += 2) { 
			if(typeof arguments[k] === "boolean") {	// Check if current argument is boolean, in which case the argument contain the allowJavascriptPrefix value
				allowJavascriptPrefix = arguments[k];
				if(k+1 < kl) {
					allowQuerystring = arguments[k+1];
				}
				break;	// Break the outer for-loop since now all arguments have been handled
			}
			_allowedTag = arguments[k];	// Get the name of the allowed tag (single value)
			_allowedAttributeList = arguments[k+1];	// Get the attribute list (array)
			allowedList[_allowedTag] = [];	// Add the tag to the allowed list associative array using the tag name as key
			for(var m = 0, ml = _allowedAttributeList.length; m<ml; m++){	// For each of the attributes of the attribute list an associative key is added with the attribute name as key (and a value of true). This will later be used to check if attribute name is allowed for the currently processed tag.			
				allowedList[_allowedTag][_allowedAttributeList[m]] = true;
			}
		}
	
		/* Start looping through the content one character at a time from the first character of the content string to its last character. */
		while(i < contentLength) {
			
			while((c = content.charAt(i++)) != '<') {	r += c; }	// Search for an opening tag (of any kind)
			
			inSingleQuotes = false; inDoubleQuotes = false;	// Initialize the single and double quote flags which are used to check for '>'-characters within quoted strings (which should be ignored)
			
			while(((c = content.charAt(i++)) != '>' || (inSingleQuotes || inDoubleQuotes) ) && i < contentLength) {	// Run through the contents of the current tag, extracting its tag name and contents
				
				if(tag == "") {	// Build tag name one character at a time
					if(!isWhitespace(c)){	// Add current character to tag name until a whitespace-character is encountered 
						if(c != '/') {	// Skipping '/' characters - because we want the tag name to stripped of any leading '/'-characters (for closing tags, example: for </div> we want the tag name to read "div" NOT: "/div". 
							tempTag += c;
						}
					}
					else {
						tag = tempTag;	// If current character is whitespace this means that the 
					}
				}
				
				/* Keeping track of single or double quotes in the string because if a '>' is encountered it should be ignored if it is enclosed in quotes. If it is not enclosed in quotes this means that the tag is ended and the current loop should be broken.*/
				if(c == "'") {
					inSingleQuotes = (inSingleQuotes) ? false : true; // Toggles single quotes on an off every time one is encountered - an odd number of quotes means that the quote is active, a even pair (including none) means that the quote is not active
				}
				else if(c == "\"") {
					inDoubleQuotes = (inDoubleQuotes) ? false : true;
				}
		
				temp += c;	// Adds the current character to the temporary string holding the contents inside the tag
			}
			
			if(tag == "" && tempTag != "") { // If the tag name is not set this could happen either because there is no tag name for the current tag or because there are no attributes, example: <div> or <p> (as opposed to <div style='...'> or <p class='...'>. This special case is handled by setting the tag name here instead.
				tag = tempTag;
			}
			
			console.log("Handling tag:"+tag);
			
			noClosing = (content.charAt(i-2) == '/') ? true : false;	// Checking if the tag is selfclosing - as indicated by having a '/'-character immediately preceeding the closing bracket
			
			if(allowedList[tag]) {	// If the current tag is in the allowed list the content between the opening bracket '<' and closing bracket '>' is sanitized by removing all attributes that are NOT explicitly listed in the attribute list for that tag.	
				r += "<"+sanitizeTagContent(temp, allowedList[tag], allowJavascriptPrefix, allowQuerystring)+">"; // TODO: Do closing tags need to be sanitized
			}
			else if(!noClosing) {	// If tag is not allowed any content following this tag until a matching end tag is found is expunged. If tag is self-closing (as indicated by the noClosing flag being set, no further action is required since such tags have no content that needs to be removed.
							
				tagCount = 1;	// Keeps track of the number of opening tags encountered. Set to 1 since one tag has been encountered when this branch of the code is run
				while(true){	// Run until matching closing tag is found
					searchTag = "";	// Holds the current tag name
					tempTag = "";
					while((c = content.charAt(i++)) != '<') { }	// Searches for opening bracket '<'
				
					while(((c = content.charAt(i++)) != '>' || (inSingleQuotes || inDoubleQuotes) ) && i < contentLength) {	// Loops around until closing bracket '>' is encountered 				
						if(searchTag == "") {	// Build tag name
							if(!isWhitespace(c)){
								tempTag += c;
							}
							else {
								searchTag = tempTag;
							}
						}
						
						if(c == "'") {	// Control for quotations as not to break loop on encountering end bracket '>' if this is enclosed in quotes (single or double)
							inSingleQuotes = (inSingleQuotes) ? false : true;
						}
						else if(c == "\"") {
							inDoubleQuotes = (inDoubleQuotes) ? false : true;
						}
					}
					
					if(searchTag == "" && tempTag != "") {	// Set tag name if not yet set. Special case if tag has no attributes, example: <div>
						searchTag = tempTag;
					}
					
					if(searchTag == '/'+tag){	// Check if the current tag is a closing tag of the same kind as the tag to be expunged 
						tagCount--;	// Reduce tag counter for each closing tag encountered
						if(tagCount <= 0) {	// If tag counter is zero, that means that it matches the opening tag and all the content up to and including this closing tag should be expunged and thus that the loop has complected at this point. If the tag counter is not zero this means that there is nested content inside the tag and that the closing tag that was encountered belongs to this nested content; and thus that the loop needs to continue until it find the final closing tag.
							break;	// Break the loop
						}
					}
					else if(searchTag == tag) {	// If the current tag is of the same type as the the tag to be expunged this means that there is nested content and that the next closing tag of this kind is not the final closing tag. The tag counter is incremented to keep track of this. Example: if div-tags are to be removed and the content contains the following string: "<div>aaa<div>bbb</div></div>", the tag counter is incremented when the second div is encountered, decremented when the first closing tag is encountered and the loop is completed when the second closing tag is encountered, thus expunging the entire content between the outer opening and closing tags.
						tagCount++;
					}
				}
			}
			temp = "";	// Reset the variout temporary variables
			tag = ""; 
			tempTag = "";
			//i++;	// Move the counter one step forward after completing the outer loop
		}
		return r;	// Return the sanitized html content
	
		/** Helper function that sanitizes the inner content of a tag. It receives the inner content and removes any attribute/attribute-value-pair that is NOT in the allowed list for the specified tag.anchor
			@param tagInnerContent The inner content of the tag, example: for "<div class='myClass'>" the inner content is div class='myClass', i.e. it is the inner contents of a single tag with the opening and closing brackets removed.
			@param allowedAttributeList An array containing the names of the attributes that are allowed. Any other attributes will be expunged.
			@param allowJavascriptPrefix Whether javascript prefixes are allowed in the attribute values for any of the allowed attributes, exampel: href="javascript:alert('...');". If prefix is allowed no action is taken, if it is not allowed the attribute (attribute and value) are expunged.
			@param allowQuerystring Whether querystrings are allowed in attribute values for any of the allowed attributes. If not allowed the querystring is stripped from the value. Note that it looks for a '?' and removes this character and any content following this it. This means that if '?' are used for any other purpose in an attribute value, it should be escaped (use html entities).
			@return Returns the sanitized string 
		*/
		function sanitizeTagContent(tagInnerContent, allowedAttributeList, allowJavascriptPrefix, allowQuerystring) {	
			console.log("Tag contents received: "+tagInnerContent);
			
			var r = "",			// Holds the sanitized contents
				c,				// Holds the current character 
				d,				// Holds the type of quote (if any) that encloses the attribute value (single or double quote)
				tagInnerContentLength = tagInnerContent.length,	// Holds the length of the content (in number of characters)
				tag = "",		// Holds the current tag name
				savedWhitespace = "",	// Holds any saved whitespace characters following a stand-alone attribute (with no value, exampel: selected, autofocus)
				name,		// Holds the current attribute name
				value,		// Holds the current attribute value
				i = 0,			// Counter used to step through the contents one character at a time
				javascriptPrefixPattern = /^[\"\']?javascript:/i,	// Regular expression pattern used to test for javascript:-prefix
				querystringPattern = /([^\?]*)(\?.*)$/g;				// Regular expression pattern used to expunge trailing querystring
				
			allowJavascriptPrefix = (allowJavascriptPrefix == undefined || allowJavascriptPrefix == null) ? false : allowJavascriptPrefix;	// Set defaults if undefined 
			allowQuerystring = (allowQuerystring == undefined || allowQuerystring == null) ? false : allowQuerystring;
			
			while(isWhitespace(c = tagInnerContent.charAt(i))) { r += c; i++; }	// Skip leading whitespace (leading whitespace in front of tag name are not allowed, but may occur)
			
			while(!isWhitespace(c = tagInnerContent.charAt(i)) && i < tagInnerContentLength) { tag += c; i++; }	// Build tag name
				
			r += tag;	// Add tag name to output string
			
			while(true){	// Go through remaing inner content (apart from tag), parsing one attribute/attribute-value-pair at a time. Leaving it in if in the allowed list and expunging it if not in list. Also checking if it contains javascript:-prefix or a querystring.	
		
				if(i+1 >= tagInnerContentLength) { break; }	// If counter has already reached en the loop is broken. This occurs if the content only contains a tag name and nothing else
							
				name = "";	// Reset the name and value variables
				value = "";
					
				while(isWhitespace(c = tagInnerContent.charAt(i))) { r += c; i++; }	// Skip leading whitespaces (but adding them to output string unedited (i.e. if the original contains extraneous whitespace characters, the output will also).
				
				while(!isWhitespace(c = tagInnerContent.charAt(i)) && c != '=' && i < tagInnerContentLength) { name += String(c); i++; }	// Build attribute name
			
				if(c != '=') {	// If the current character is not the equals sign, this means that the attribute is a stand-alone attribute (with no value-portion)
					if(allowedAttributeList[name] || ((i == tagInnerContentLength) && name == '/')) {	// Check if the attribute is in the allowed list. Also allow special case that the attribute is a the '/' preceeding the closing bracket. 
						r += name;
						while(isWhitespace(c = tagInnerContent.charAt(i))) { r += c; i++; }	// Add the trailing whitespace characters following the stand-alone attribute
					}
				}
				else {	// If the attribute name is followed by an equals sign, the next portion is the value for this attribute
					i++;	// Step forward one character to consume the euals sign (which is added when the attribut-value-pair is added to the output string).
					while(isWhitespace(c = tagInnerContent.charAt(i))) { i++; }	// Skip any whitespace characters that are inbetween the equals sign and the attribute value
					
					c = tagInnerContent.charAt(i);
					if(c == "\"" || c == "'") {	// Check if the value is enclosed in quotes (single or double)
						d = c;	// Store the type of quote for re-use later
						i++;	// Step forward one character consuming the quote character
						while((c = tagInnerContent.charAt(i++)) != d) { value += String(c); }	// Build the value string by adding one character at a time until the quote is ended
					}
					else {	// If no quotes are used
						while(!isWhitespace(c = tagInnerContent.charAt(i++)) && i < tagInnerContentLength) { value += String(c); }	// Build value string by adding one characters at a time until a whitespace (or the end of the inner content) is reached.
					}
					if(allowedAttributeList[name]) {	// If the attribute name is in the allowed list the attribute and its value are output to the output string, otherwise the attribute-value-pair is expunged
						if(!allowQuerystring) {	// If querystrings are not allowed this is removed using a regular expressions to remove any content following a '?'-character and also the '?'-character.
							value = value.replace(querystringPattern, "$1");
						}
						if(allowJavascriptPrefix || (!allowJavascriptPrefix && !javascriptPrefixPattern.test(value))) {	// If javascript:-prefixes are not allowed the attribut-value-pair is expunged
							r += name+"="+d+value+d;
						}
					}
				}
			}
			
			return r;	// Return the sanitized inner content, which now only contains attributes/attribute-value-pairs that are allowed and their values have be checked for javascript:-prefixes and querystrings
		}
		/** Helper function that checks if supplied argument is a whitespace character.
			@param c The character to check
			@return Returs true if character is a whitespace character and false if it is not.
			*/
		function isWhitespace(c) {
			if(c == " " || c == "\t" || c == "\n") { return true; }
			else { return false; }
		}
	}
}