// Scroll to Beta Form
function scrollToForm() {
  document.getElementById("beta").scrollIntoView({ behavior: "smooth" });
}

// Beta Form Submission via EmailJS
document.getElementById("betaForm").addEventListener("submit", function (e) {
  e.preventDefault();

  // Replace with your EmailJS service ID and template ID
  const serviceID = "service_lqaas6k";
  const templateID = "template_ben15lj";

  emailjs.sendForm(serviceID, templateID, this)
    .then(() => {
      alert("✅ Application sent successfully! We’ll reach out soon.");
      this.reset();
    })
    .catch((error) => {
      console.error("❌ EmailJS Error:", error);
      alert("Failed to send. Please try again later.");
    });
});

// Newsletter Subscribe via EmailJS (optional)
document.getElementById("newsletterForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const serviceID = "service_lqaas6k";
  const templateID = "template_ben15lj";

  emailjs.sendForm(serviceID, templateID, this)
    .then(() => {
      alert("✅ You’re subscribed! Stay tuned for updates.");
      this.reset();
    })
    .catch((error) => {
      console.error("❌ Newsletter Error:", error);
      alert("Failed to subscribe. Try again later.");
    });
});
