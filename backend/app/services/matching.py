def normalized_match_text(value: str | None) -> str:
    return " ".join((value or "").casefold().split())


def text_matches(query: str, candidate: str | None) -> bool:
    normalized_query = normalized_match_text(query)
    if not normalized_query:
        return False
    return normalized_query in normalized_match_text(candidate)
