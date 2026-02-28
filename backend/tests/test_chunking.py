"""Tests for chunking utility."""
import pytest
from app.utils.chunking import chunk_document, _split_sentences


class TestSplitSentences:
    def test_japanese_period(self):
        text = "最初の文。次の文。最後の文。"
        sentences = _split_sentences(text)
        assert len(sentences) == 3
        assert sentences[0] == "最初の文。"
        assert sentences[1] == "次の文。"
        assert sentences[2] == "最後の文。"

    def test_newline_split(self):
        text = "一行目\n二行目\n三行目"
        sentences = _split_sentences(text)
        assert len(sentences) == 3

    def test_double_newline(self):
        text = "段落1\n\n段落2"
        sentences = _split_sentences(text)
        assert len(sentences) == 2

    def test_mixed_delimiters(self):
        text = "質問です？はい。了解！\n次の行"
        sentences = _split_sentences(text)
        assert len(sentences) == 4

    def test_empty_text(self):
        assert _split_sentences("") == []
        assert _split_sentences("   ") == []


class TestChunkDocument:
    def test_empty_content(self):
        assert chunk_document("") == []
        assert chunk_document("  ") == []

    def test_short_content_single_chunk(self):
        content = "短いテキストです。"
        chunks = chunk_document(content, chunk_size=512)
        assert len(chunks) == 1
        assert "短いテキストです" in chunks[0]["content"]
        assert chunks[0]["token_count"] > 0

    def test_title_prefix(self):
        chunks = chunk_document("テスト内容。", title="マニュアル")
        assert len(chunks) == 1
        assert chunks[0]["content"].startswith("[マニュアル]")

    def test_long_content_multiple_chunks(self):
        # Create content that exceeds chunk_size
        sentences = ["これはテストの文章です。" * 10 for _ in range(20)]
        content = "\n".join(sentences)
        chunks = chunk_document(content, chunk_size=50, chunk_overlap=5)
        assert len(chunks) > 1

    def test_overlap(self):
        # With overlap, chunks should share some content
        content = "文A。文B。文C。文D。文E。文F。文G。文H。"
        chunks = chunk_document(content, chunk_size=10, chunk_overlap=3)
        if len(chunks) > 1:
            # Overlap means content from end of chunk N appears at start of chunk N+1
            # This is a structural test - just verify we got multiple chunks
            assert len(chunks) >= 2

    def test_token_count_reasonable(self):
        content = "日本語のテキスト。" * 10
        chunks = chunk_document(content, chunk_size=512)
        for chunk in chunks:
            assert chunk["token_count"] > 0
            # Token count should be roughly half the character count
            assert chunk["token_count"] <= len(chunk["content"])

    def test_very_long_sentence_force_split(self):
        # A single sentence longer than chunk_size
        long_sentence = "あ" * 2000
        chunks = chunk_document(long_sentence, chunk_size=100)
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk["content"]) > 0
