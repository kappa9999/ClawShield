# Draft Homebrew formula for ClawShield
#
# TODO: Update the sha256 after tagging a release.

require "language/node"

class ClawShield < Formula
  desc "Security preflight and guardrails for OpenClaw/Moltbot"
  homepage "https://github.com/kappa9999/ClawShield"
  url "https://github.com/kappa9999/ClawShield/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "a19fade66c5259af50ff8d1a0c0f81971f9ff3bd15fc41f708f7cafc2886723a"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
  end

  test do
    system "#{bin}/clawshield", "--help"
  end
end
