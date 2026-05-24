export default function Footer() {
  return (
    <footer className="footer">
      {/* Top footer content */}
      <div className="footer-top">
        {/* Contact information section */}
        <div className="footer-boxes">
          <h3>Contact Us</h3>

          <div className="footer-contact">
            {/* Email info */}
            <p>
              Email:
              <br />
              nestorgofficial@gmail.com
            </p>

            {/* Phone number */}
            <p>
              Phone:
              <br />
              (123) 456-7890
            </p>

            {/* School / office address */}
            <p>
              Address:
              <br />
              Cavite State University, Indang, Cavite
            </p>
          </div>
        </div>
      </div>

      {/* Divider line */}
      <hr />

      {/* Bottom copyright section */}
      <div className="footer-bottom">
        <p>© 2026 NestOrg. All rights reserved.</p>
      </div>
    </footer>
  );
}
