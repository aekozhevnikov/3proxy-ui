package logs

import "testing"

func TestBoundedLimit(t *testing.T) {
	cases := []struct {
		in   string
		want int
	}{
		{"1000", 1000},
		{"999999999", 5000},
		{"abc", 1000},
		{"0", 1000},
		{"-5", 1000},
	}
	for _, c := range cases {
		if got := BoundedLimit(c.in); got != c.want {
			t.Errorf("BoundedLimit(%q)=%d want %d", c.in, got, c.want)
		}
	}
}
