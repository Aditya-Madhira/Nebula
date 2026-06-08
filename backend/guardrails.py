import re

# Comprehensive guardrail rules and regex definitions
_CODING_PATTERNS = [
  r'\b(write|create|generate|make|show|explain|teach|help\s+with)\b.*\b(python|javascript|typescript|c\+\+|c#|java|go|rust|sql|css|html|bash|php|ruby|assembly|perl|code|programming|script)\b',
  r'\b(code|function|class|program|script|regex|method|loop|array|pointer|struct|selector|selectors)\s+(in|to|for|of|with|about)\s+(python|javascript|typescript|c\+\+|c#|java|go|rust|sql|css|html|bash|php)\b',
  r'\b(css|html|javascript|sql|python)\s+(boilerplate|snippet|selector|selectors|injection|code|styling|rules|script)\b',
  r'\b(write|generate|debug)\s+code\b',
  r'\b(how to code|how to program)\b'
]

_HACKING_PATTERNS = [
  r'\b(hack|hacker|hacking|bypass|crack|exploit|penetrate|brute\s*force|ddos|malware|keylogger|backdoor|phishing)\b',
  r'\b(sql\s*injection|cross\s*site\s*scripting|xss|reverse\s*shell)\b',
  r'\b(bypass\s+security|exploit\s+vulnerability|hack\s+database|crack\s+password)\b'
]

_ACADEMIC_MATH_PATTERNS = [
  r'\b(solve\s+the\s+equation|calculate\s+the\s+derivative|integrate\s+the\s+function|find\s+the\s+limit\s+of)\b',
  r'\b(calculus|algebra\s+homework|geometry\s+proof|trigonometric\s+identity)\b',
  r'\b(derivative\s+of|integral\s+of|limit\s+as\s+x\s+approaches)\b'
]

# Gibberish keyboard mash detector: words with more than 7 consecutive consonants, or repetitive patterns
_GIBBERISH_PATTERNS = [
  r'\b[^aeiouy\s\d\W]{7,}\b', # e.g. "asdfghj" (no vowels)
  r'\b(qwerty|asdfg|zxcvb|qwertyy)\w*\b', # standard keyboard slides
  r'(.)\1{5,}' # word containing a single letter repeated 6+ times (e.g. "aaaaaa")
]

def validate_user_query(message: str) -> tuple[bool, str]:
  """
  Checks user's chat input for irrelevant or out-of-scope information.
  Returns (is_valid, Nebulous_response_if_invalid).
  """
  if not message or not message.strip():
    return True, ""

  msg_lower = message.lower().strip()

  # 1. Hacking & Security Guardrails
  for pattern in _HACKING_PATTERNS:
    if re.search(pattern, msg_lower):
      return False, (
        "I am terribly sorry, my friend, but my security protocols strictly forbid assisting with "
        "penetration testing, hacking, or anything of a malicious nature. Let us keep our focus on "
        "pleasant conversation and excellent anime, shall we?"
      )

  # 2. Programming & Code Generation Guardrails
  for pattern in _CODING_PATTERNS:
    if re.search(pattern, msg_lower):
      return False, (
        "I'm afraid I cannot help you with writing or debugging code, Sir. While I am rather sophisticated, "
        "my current modules are tuned for friendly companionship and specialized anime guidance. "
        "I must politely recommend consulting standard programming resources for that."
      )

  # 3. Academic Math / Homework Guardrails
  for pattern in _ACADEMIC_MATH_PATTERNS:
    if re.search(pattern, msg_lower):
      return False, (
        "Ah, solving mathematical equations is slightly outside my current parameters, Madame. "
        "I am optimized for anime curation and friendly assistant conversations, not algebraic homework. "
        "I am sure you will crack it in no time!"
      )

  # 4. Gibberish & Spam Guardrails
  for pattern in _GIBBERISH_PATTERNS:
    if re.search(pattern, msg_lower):
      return False, (
        "Pardon me, my friend, but that input appears to be absolute jumble to my linguistics engine. "
        "If you have a question about a particular anime or would simply like to chat, "
        "please ask in plain language, and I shall be happy to assist."
      )

  # Clean and valid!
  return True, ""
