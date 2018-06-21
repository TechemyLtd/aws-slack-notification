# Contributing

Remember to keep it clean. Harassment in code and discussion is completely unacceptable anywhere in our projects code, comments, documentation, issue
trackers and related materials. For reference see [Thoughtbot's code of conduct].

[Thoughtbot's code of conduct]: https://thoughtbot.com/open-source-code-of-conduct

Setup [GitHub signing].

[GitHub signing]: https://help.github.com/articles/adding-a-new-gpg-key-to-your-github-account/

Fork the repo into your git profile, or clone our repo:

Clone the repo:

    git clone git@github.com:bnc-projects/aws-slack-notification.git

Make sure you have the latest from master:

    git checkout master
    git fetch -p
    git rebase

Create a new branch for your feature or bugfix:

    git checkout -b <feature-or-bug-fix-name>

Make sure the tests pass:

    ./gradlew check

Find a pair and make a change together. Add tests for your change. Make the tests pass:

    ./gradlew check

Push your changes to your github profile with a [good commit message][commit]. And raise a pull request.

Remember the following:

* Pair to write code and tests.
* Aim for 100% coverage of new code.
* Follow our style.
* Write a [good commit message][commit].

[commit]: http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html
