import unittest
from verify import normalize,distance,ORTHOGRAPHY,POLICY,cache_matches

class RoundTripTests(unittest.TestCase):
    def test_points_and_punctuation(self):
        self.assertEqual(normalize('בְּרֵאשִׁית בָּרָא׃'),normalize('בראשית ברא.'))
    def test_missing_word(self):
        self.assertEqual(distance(normalize('בראשית ברא אלהים'),normalize('בראשית אלהים')),1)
    def test_wrong_word(self):
        self.assertEqual(distance(normalize('אור'),normalize('עור')),1)
    def test_divine_name_not_equated(self):
        self.assertNotEqual(normalize('יהוה'),normalize('אדני'))
    def test_vowel_limitation(self):
        self.assertEqual(normalize('שָׁלוֹם'),normalize('שִׁלוּם'))
    def test_equivalences_narrow(self):
        self.assertNotEqual(ORTHOGRAPHY.get('אליהם','אליהם'),ORTHOGRAPHY.get('אלהים','אלהים'))
    def test_stale_cache_rejected(self):
        old={'audioSha256':'a','fingerprint':'f','model':'m','modelRevision':'r','verifierPolicy':POLICY}
        self.assertTrue(cache_matches(old,'a','f','m','r'))
        for key in ['audioSha256','fingerprint','model','modelRevision','verifierPolicy']:
            changed=dict(old);changed[key]='stale'
            self.assertFalse(cache_matches(changed,'a','f','m','r'))

if __name__=='__main__':unittest.main()
